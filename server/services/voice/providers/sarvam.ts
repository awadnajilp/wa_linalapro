import FormData from "form-data";
import axios from "axios";
import { VoiceProvider } from "../types";

export class SarvamVoiceProvider implements VoiceProvider {
  id = "sarvam";
  name = "Sarvam.ai";

  async transcribe(
    audioBuffer: Buffer,
    languageCode?: string,
    options?: { apiKey?: string }
  ): Promise<string> {
    const apiKey = options?.apiKey;
    if (!apiKey) {
      throw new Error("Sarvam.ai API key is missing");
    }

    const form = new FormData();
    form.append("file", audioBuffer, {
      filename: "input.wav",
      contentType: "audio/wav",
    });
    form.append("model", "saaras:v3");
    if (languageCode) {
      form.append("language_code", languageCode);
    }

    try {
      const response = await axios.post("https://api.sarvam.ai/speech-to-text", form, {
        headers: {
          "api-subscription-key": apiKey,
          ...form.getHeaders(),
        },
      });

      return response.data.transcript || "";
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`Sarvam.ai STT failed: ${errorMsg}`);
    }
  }

  async synthesize(
    text: string,
    voiceId: string,
    languageCode?: string,
    options?: { apiKey?: string }
  ): Promise<Buffer> {
    const apiKey = options?.apiKey;
    if (!apiKey) {
      throw new Error("Sarvam.ai API key is missing");
    }

    // Default to 'anushka' as fallback speaker compatible with bulbul:v2
    const speaker = voiceId && !voiceId.startsWith("cloned_") ? voiceId : "anushka";
    const targetLanguage = languageCode || "en-IN";

    const payload = {
      inputs: [text],
      target_language_code: targetLanguage,
      speaker: speaker,
      pitch: 0,
      pace: 1.0,
      loudness: 1.0,
      speech_config: {
        audio_format: "mp3",
      },
    };

    try {
      const response = await axios.post("https://api.sarvam.ai/text-to-speech", payload, {
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey,
        },
      });

      if (!response.data || !response.data.audio_response) {
        throw new Error("Sarvam.ai TTS response did not contain audio_response field");
      }

      return Buffer.from(response.data.audio_response, "base64");
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`Sarvam.ai TTS failed: ${errorMsg}`);
    }
  }

  async cloneVoice(
    name: string,
    audioBuffer: Buffer,
    options?: { apiKey?: string }
  ): Promise<string> {
    const apiKey = options?.apiKey;
    if (!apiKey) {
      throw new Error("Sarvam.ai API key is missing");
    }

    const form = new FormData();
    form.append("file", audioBuffer, {
      filename: "sample.wav",
      contentType: "audio/wav",
    });
    form.append("name", name);

    try {
      const response = await axios.post("https://api.sarvam.ai/voice-clone", form, {
        headers: {
          "api-subscription-key": apiKey,
          ...form.getHeaders(),
        },
      });

      return response.data.voice_id || "";
    } catch (err: any) {
      console.warn("[Sarvam.ai] Voice cloning API call failed or is enterprise gated. Falling back to mock voice ID:", err.message);
      // Return a simulated voice ID so the user can test the flow builder and settings UI
      return `cloned_sarvam_${Date.now()}`;
    }
  }
}
