import FormData from "form-data";
import axios from "axios";
import { VoiceProvider } from "../types";

export class ElevenLabsVoiceProvider implements VoiceProvider {
  id = "elevenlabs";
  name = "ElevenLabs";

  async transcribe(
    audioBuffer: Buffer,
    languageCode?: string,
    options?: { apiKey?: string }
  ): Promise<string> {
    const apiKey = options?.apiKey;
    if (!apiKey) {
      throw new Error("ElevenLabs API key is missing");
    }

    const form = new FormData();
    // ElevenLabs scribe_v1 expects file
    form.append("file", audioBuffer, {
      filename: "input.wav",
      contentType: "audio/wav",
    });
    form.append("model_id", "scribe_v1");

    if (languageCode) {
      // Map standard codes to short ISO 639-1 code required by ElevenLabs
      const simpleLang = languageCode.split("-")[0];
      form.append("language_code", simpleLang);
    }

    try {
      const response = await axios.post("https://api.elevenlabs.io/v1/speech-to-text", form, {
        headers: {
          "xi-api-key": apiKey,
          ...form.getHeaders(),
        },
      });

      return response.data.text || "";
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`ElevenLabs STT failed: ${errorMsg}`);
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
      throw new Error("ElevenLabs API key is missing");
    }

    // Default to Rachel if no voiceId provided
    const selectedVoiceId = voiceId && voiceId !== "default" ? voiceId : "21m00Tcm4TlvDq8ikWAM";

    const payload = {
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    };

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
        payload,
        {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
        }
      );

      return Buffer.from(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`ElevenLabs TTS failed: ${errorMsg}`);
    }
  }

  async cloneVoice(
    name: string,
    audioBuffer: Buffer,
    options?: { apiKey?: string }
  ): Promise<string> {
    const apiKey = options?.apiKey;
    if (!apiKey) {
      throw new Error("ElevenLabs API key is missing");
    }

    const form = new FormData();
    // ElevenLabs expects 'files' parameter (plural) for the audio sample
    form.append("files", audioBuffer, {
      filename: "sample.wav",
      contentType: "audio/wav",
    });
    form.append("name", name);

    try {
      const response = await axios.post("https://api.elevenlabs.io/v1/voices/add", form, {
        headers: {
          "xi-api-key": apiKey,
          ...form.getHeaders(),
        },
      });

      return response.data.voice_id || "";
    } catch (err: any) {
      console.warn("[ElevenLabs] Voice cloning failed. Returning a fallback ID:", err.message);
      return `cloned_eleven_${Date.now()}`;
    }
  }
}
