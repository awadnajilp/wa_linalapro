import FormData from "form-data";
import axios from "axios";
import { VoiceProvider } from "../types";

export class OpenAIVoiceProvider implements VoiceProvider {
  id = "openai";
  name = "OpenAI Audio";

  async transcribe(
    audioBuffer: Buffer,
    languageCode?: string,
    options?: { apiKey?: string }
  ): Promise<string> {
    const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key is missing");
    }

    const form = new FormData();
    form.append("file", audioBuffer, {
      filename: "input.ogg",
      contentType: "audio/ogg",
    });
    form.append("model", "whisper-1");

    if (languageCode) {
      const simpleLang = languageCode.split("-")[0];
      form.append("language", simpleLang);
    }

    try {
      const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...form.getHeaders(),
        },
      });

      return response.data.text || "";
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`OpenAI STT failed: ${errorMsg}`);
    }
  }

  async synthesize(
    text: string,
    voiceId: string,
    languageCode?: string,
    options?: { apiKey?: string }
  ): Promise<Buffer> {
    const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key is missing");
    }

    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = validVoices.includes(voiceId?.toLowerCase()) ? voiceId.toLowerCase() : "alloy";

    const payload = {
      model: "tts-1",
      input: text,
      voice: selectedVoice,
      response_format: "opus",
    };

    try {
      const response = await axios.post("https://api.openai.com/v1/audio/speech", payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      });

      return Buffer.from(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`OpenAI TTS failed: ${errorMsg}`);
    }
  }

  async cloneVoice(
    name: string,
    audioBuffer: Buffer,
    options?: { apiKey?: string }
  ): Promise<string> {
    throw new Error("OpenAI does not support voice cloning.");
  }
}
