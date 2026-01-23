import google.generativeai as genai
from app.core.config import settings
import os
import time

class TranscriptionService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("models/gemini-3-flash-preview")
        else:
            self.model = None

    def transcribe_audio(self, file_path: str):
        """
        Transcribes the audio file using Google Gemini API.
        Returns the transcript text.
        """
        if not self.model:
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
            print(f"Uploading file {file_path} to Gemini...")
            
            # Determine MIME type
            mime_type = "audio/wav" # default
            if file_path.endswith(".mp3"):
                mime_type = "audio/mpeg"
            elif file_path.endswith(".ogg"):
                mime_type = "audio/ogg"
            elif file_path.endswith(".m4a"):
                mime_type = "audio/mp4"
            
            # Upload the file to Gemini
            audio_file = genai.upload_file(file_path, mime_type=mime_type)
            
            # Wait for processing state to be ACTIVE
            while audio_file.state.name == "PROCESSING":
                print("Waiting for audio file processing...")
                time.sleep(1)
                audio_file = genai.get_file(audio_file.name)

            print(f"File State: {audio_file.state.name}")
            if audio_file.state.name == "FAILED":
                raise Exception("Audio file processing failed on Gemini side.")

            print("Generating transcript...")
            # Configure safety settings to avoid blocking
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
            
            # Request JSON structure
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
            3. Return ONLY the JSON object. Do not include any "Thinking Process", markdown formatting (like ```json), or introductory text. 
            """
            
            response = self.model.generate_content([
                prompt,
                audio_file
            ], safety_settings=safety_settings, generation_config={"response_mime_type": "application/json"})
            
            # Extract text (or handle partial)
            import json
            import re
            transcript_data = {}
            plain_text = ""
            
            try:
                text_response = response.text
                
                # Attempt to clean up if Gemini includes markdown or text
                # Find first { and last }
                start_idx = text_response.find('{')
                end_idx = text_response.rfind('}')
                
                if start_idx != -1 and end_idx != -1:
                    json_str = text_response[start_idx:end_idx+1]
                    transcript_data = json.loads(json_str)
                else:
                    # Try direct load if no braces found (unlikely for object)
                    transcript_data = json.loads(text_response)
                
                # Construct plain text from segments
                if "segments" in transcript_data:
                    plain_text = "\n".join([seg["text"] for seg in transcript_data["segments"]])
                else:
                    raise ValueError("No segments found in JSON")

            except (ValueError, json.JSONDecodeError):
                # Fallback if not valid JSON (shouldn't happen with generation_config but good to be safe)
                print("Failed to parse JSON response. Using raw text.")
                plain_text = response.text
                transcript_data = {"segments": [], "raw": response.text}
            except Exception as e:
                # Handle safety block or other errors
                if response.prompt_feedback:
                     print(f"Prompt feedback: {response.prompt_feedback}")
                if response.candidates and response.candidates[0].finish_reason:
                     print(f"Finish reason: {response.candidates[0].finish_reason}")
                raise Exception(f"Transcription error: {e}")

            # Clean up file from Gemini storage (optional but good practice)
            # genai.delete_file(audio_file.name) 
            
            return {
                "text": plain_text,
                "metadata": {
                    "duration": 0, 
                    "model": "gemini-3-flash-preview",
                    "segments": transcript_data.get("segments", [])
                }
            }
        except Exception as e:
            print(f"Transcription error: {e}")
            raise e

transcription_service = TranscriptionService()
