import { VoiceProvider } from "./types";
import { SarvamVoiceProvider } from "./providers/sarvam";
import { GroqVoiceProvider } from "./providers/groq";
import { ElevenLabsVoiceProvider } from "./providers/elevenlabs";
import { OpenAIVoiceProvider } from "./providers/openai";

export class VoiceManager {
  private static providers = new Map<string, VoiceProvider>();

  static {
    // Register the active providers
    this.register(new SarvamVoiceProvider());
    this.register(new GroqVoiceProvider());
    this.register(new ElevenLabsVoiceProvider());
    this.register(new OpenAIVoiceProvider());
  }

  static register(provider: VoiceProvider) {
    this.providers.set(provider.id, provider);
  }

  static getProvider(id: string): VoiceProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Voice provider '${id}' is not supported or configured.`);
    }
    return provider;
  }

  static hasProvider(id: string): boolean {
    return this.providers.has(id);
  }
}

export * from "./types";
export * from "./providers/sarvam";
export * from "./providers/elevenlabs";
export * from "./providers/groq";
export * from "./providers/openai";
