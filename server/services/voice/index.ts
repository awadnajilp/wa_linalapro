import { VoiceProvider } from "./types";
import { SarvamVoiceProvider } from "./providers/sarvam";
import { GroqVoiceProvider } from "./providers/groq";

export class VoiceManager {
  private static providers = new Map<string, VoiceProvider>();

  static {
    // Register the active providers
    this.register(new SarvamVoiceProvider());
    this.register(new GroqVoiceProvider());
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
