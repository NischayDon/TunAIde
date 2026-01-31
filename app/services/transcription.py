from google import genai
from google.genai import types
from app.core.config import settings
import os
import time
import json
import shutil

class TranscriptionService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            self.model_id = "gemini-3.0-flash" # Retrying 3.0 with robust parsing logic
        else:
            self.client = None

    def transcribe_audio(self, file_path: str):
        """
        Transcribes the audio file using Google Gemini API.
        Returns the transcript text.
        """
        if not self.client:
            # Fallback for dev/testing without keys
            print("WARNING: Gemini API Key missing. Returning mock transcript.")
            return {
                "text": "This is a simulated transcript from Gemini (Mock) because no API key was provided. The system is working correctly.\nThis is the second segment of the mock transcription to demonstrate timestamps.",
                "metadata": {
                    "mock": True, 
                    "duration": 42.0,
                    "segments": [
                        {"start": "00:00", "end": "00:05", "text": "This is a simulated transcript from Gemini (Mock) because no API key was provided."},
                        {"start": "00:05", "end": "00:10", "text": "The system is working correctly."},
                        {"start": "00:10", "end": "00:15", "text": "This is the second segment of the mock transcription to demonstrate timestamps."}
                    ]
                }
            }

        try:
            # NOTE: New SDK uses 'client.files.upload'
            upload_result = self.client.files.upload(file=file_path)
            file_name = upload_result.name
            
            # 2. Wait for processing
            while upload_result.state.name == "PROCESSING":
                print("Waiting for audio file processing...")
                time.sleep(1)
                upload_result = self.client.files.get(name=file_name)

            print(f"File State: {upload_result.state.name}")
            print(f"File URI: {upload_result.uri}")
            print(f"File MIME: {upload_result.mime_type}")
            print(f"File Size: {upload_result.size_bytes} bytes")

            if upload_result.state.name == "FAILED":
                raise Exception("Audio file processing failed on Gemini side.")
            
            if upload_result.size_bytes == 0:
                 raise Exception("Uploaded file size is 0 bytes. Logic error in file handling.")

            print("Generating transcript...")
            
            # 3. Generate Content with Config
            # 3. Generate Content with Config
            prompt = """
            Transcribe the audio file. 
            Return a JSON object in the following format:
            {
                "segments": [
                    {"start": "MM:SS", "end": "MM:SS", "text": "transcription segment..."}
                ]
            }
            1. The "text" field must contain ONLY the spoken words. Do NOT include the timestamp in the "text" field.
            2. The "start" and "end" timestamps must be formatted as MM:SS.
            3. Return ONLY the JSON object. Do not wrap it in markdown code blocks.
            """

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[upload_result, prompt],
                config=types.GenerateContentConfig(
                    # remove strict json enforcement to avoid 500 errors
                    safety_settings=[
                        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                    ]
                )
            )
            
            # 4. Parse Response
            transcript_data = {}
            plain_text = ""
            duration_seconds = 0
            
            try:
                text_response = response.text
                # Clean up potential markdown wrapping
                if text_response.startswith("```json"):
                    text_response = text_response[7:]
                if text_response.startswith("```"):
                    text_response = text_response[3:]
                if text_response.endswith("```"):
                    text_response = text_response[:-3]
                
                text_response = text_response.strip()
                
                try:
                    transcript_data = json.loads(text_response)
                except json.JSONDecodeError:
                     # Try to find JSON object via regex if mixed with text
                     import re
                     match = re.search(r'\{.*\}', text_response, re.DOTALL)
                     if match:
                         transcript_data = json.loads(match.group(0))
                     else:
                         raise

                
                # Construct plain text from segments
                if "segments" in transcript_data:
                    segments = transcript_data["segments"]
                    plain_text = "\n".join([seg["text"] for seg in segments])
                    
                    # Calculate duration from last segment
                    if segments:
                        last_seg = segments[-1]
                        end_time_str = last_seg.get("end", "00:00")
                        # Parse MM:SS
                        try:
                            parts = end_time_str.split(":")
                            if len(parts) == 2:
                                duration_seconds = int(parts[0]) * 60 + int(parts[1])
                            elif len(parts) == 3: # HH:MM:SS
                                duration_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                        except Exception:
                            print(f"Failed to parse duration from {end_time_str}")
                            
                else:
                    plain_text = text_response
                    
            except Exception as e:
                print(f"Failed to parse JSON response: {e}")
                plain_text = response.text
                transcript_data = {"segments": [], "raw": response.text}

            return {
                "text": plain_text,
                "metadata": {
                    "duration": duration_seconds, 
                    "model": self.model_id,
                    "segments": transcript_data.get("segments", [])
                }
            }
        except Exception as e:
            print(f"Transcription error: {e}")
            raise e

transcription_service = TranscriptionService()
