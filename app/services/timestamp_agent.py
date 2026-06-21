import json
import base64
import requests
from app.core.config import settings

class TimestampAgent:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = settings.OPENROUTER_GEMINI_MODEL

    def generate_timestamps(self, audio_path: str, transcript_text: str) -> list:
        if not self.api_key:
            print("TimestampAgent: No OpenRouter API key configured. Skipping timestamp generation.")
            return []

        print(f"TimestampAgent: Processing {audio_path} using OpenRouter ({self.model})")
        
        try:
            # 1. Read and encode the audio file
            with open(audio_path, "rb") as f:
                audio_bytes = f.read()
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            # Determine audio format
            ext = audio_path.rsplit(".", 1)[-1].lower() if "." in audio_path else "mp3"
            mime_type = f"audio/{ext}"
            
            # 2. Call OpenRouter
            prompt = f"""
Here is a transcript that was generated for the attached audio file:

<transcript>
{transcript_text}
</transcript>

Your task is to analyze the audio and the transcript, and provide the exact timestamps for the spoken text.
Divide the transcript into logical sentences or phrases.
Return a JSON object with a single key "segments" that contains an array of objects.
Each object in the array must have the following keys:
- "start": start time in seconds (float, e.g. 1.2)
- "end": end time in seconds (float, e.g. 4.5)
- "text": the exact text spoken in that segment (string)

Ensure that the text matches the provided transcript exactly. Do not add or remove words.
Respond ONLY with the JSON object.
"""
            
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{audio_base64}"
                                }
                            }
                        ]
                    }
                ],
                "response_format": {"type": "json_object"}
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            print("TimestampAgent: Requesting timestamps from OpenRouter Gemini...")
            response = requests.post(self.base_url, json=payload, headers=headers, timeout=300)
            
            if response.status_code != 200:
                print(f"TimestampAgent: API Error: {response.status_code} - {response.text}")
                return []
                
            result = response.json()
            message_content = result["choices"][0]["message"]["content"]
            
            # 4. Parse the result
            try:
                # Sometime Gemini returns it wrapped in ```json
                if message_content.startswith("```json"):
                    message_content = message_content[7:-3].strip()
                elif message_content.startswith("```"):
                    message_content = message_content[3:-3].strip()
                    
                parsed_json = json.loads(message_content)
                segments = parsed_json.get("segments", [])
                
                # Fallback if it returned an array directly despite the prompt
                if isinstance(parsed_json, list):
                    segments = parsed_json
                    
                print(f"TimestampAgent: Successfully generated {len(segments)} segments.")
                return segments
            except json.JSONDecodeError as parse_e:
                print(f"TimestampAgent: Failed to parse JSON from Gemini: {parse_e}")
                print(f"Raw response: {message_content}")
                return []
                
        except Exception as e:
            print(f"TimestampAgent: Error calling Gemini: {e}")
            return []

timestamp_agent = TimestampAgent()
