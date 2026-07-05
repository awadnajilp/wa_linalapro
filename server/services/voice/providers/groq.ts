import FormData from "form-data";
import axios from "axios";
import { VoiceProvider } from "../types";

export class GroqVoiceProvider implements VoiceProvider {
  id = "groq";
  name = "Groq API";

  async transcribe(
    audioBuffer: Buffer,
    languageCode?: string,
    options?: { apiKey?: string }
  ): Promise<string> {
    const apiKey = options?.apiKey;
    if (!apiKey) {
      throw new Error("Groq API key is missing");
    }

    const form = new FormData();
    // Groq Whisper expects standard formats, input.wav is safe
    form.append("file", audioBuffer, {
      filename: "input.wav",
      contentType: "audio/wav",
    });
    form.append("model", "whisper-large-v3");

    if (languageCode) {
      // Map standard codes to short ISO 639-1 code required by Groq Whisper
      const simpleLang = languageCode.split("-")[0];
      form.append("language", simpleLang);
    }

    try {
      const response = await axios.post("https://api.groq.com/openai/v1/audio/transcriptions", form, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...form.getHeaders(),
        },
      });

      return response.data.text || "";
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`Groq STT failed: ${errorMsg}`);
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
      throw new Error("Groq API key is missing");
    }

    // Default to Canopy Labs Orpheus English model or Saudi Arabic based on language
    let defaultModel = "canopylabs/orpheus-v1-english";
    let selectedVoice = "diana"; // default English female voice

    if (languageCode && languageCode.startsWith("ar")) {
      defaultModel = "canopylabs/orpheus-arabic-saudi";
      selectedVoice = "daniel"; // default Arabic male voice
    }

    // Determine model and voice
    let model = defaultModel;
    if (voiceId && voiceId.includes("/")) {
      model = voiceId;
      if (voiceId.includes("arabic") || voiceId.includes("saudi")) {
        selectedVoice = "daniel";
      } else {
        selectedVoice = "diana";
      }
    } else if (voiceId && voiceId !== "default" && voiceId !== "") {
      selectedVoice = voiceId;
    }

    const payload = {
      model: model,
      input: text,
      voice: selectedVoice,
      response_format: "mp3",
    };

    try {
      const response = await axios.post("https://api.groq.com/openai/v1/audio/speech", payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      });

      return Buffer.from(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`Groq TTS failed: ${errorMsg}`);
    }
  }

  async cloneVoice(
    name: string,
    audioBuffer: Buffer,
    options?: { apiKey?: string }
  ): Promise<string> {
    throw new Error("Groq API does not support voice cloning.");
  }
}
