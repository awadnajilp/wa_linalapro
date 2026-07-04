import FormData from "form-data";
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
    form.append("model", "saaras:v1");
    if (languageCode) {
      form.append("language_code", languageCode);
    }

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        ...form.getHeaders(),
      },
      body: form as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sarvam.ai STT failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as { transcript: string };
    return result.transcript || "";
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

    const speaker = voiceId || "meera";
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

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sarvam.ai TTS failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as { audio_response: string };
    if (!result.audio_response) {
      throw new Error("Sarvam.ai TTS response did not contain audio_response field");
    }

    return Buffer.from(result.audio_response, "base64");
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

    const response = await fetch("https://api.sarvam.ai/voice-clone", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        ...form.getHeaders(),
      },
      body: form as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sarvam.ai Voice Clone failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as { voice_id: string };
    return result.voice_id || "";
  }
}
