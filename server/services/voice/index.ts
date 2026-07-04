import { VoiceProvider } from "./types";
import { SarvamVoiceProvider } from "./providers/sarvam";

export class VoiceManager {
  private static providers = new Map<string, VoiceProvider>();

  static {
    // Register the active Sarvam.ai provider
    this.register(new SarvamVoiceProvider());
    
    // Skeletons for future engines (ElevenLabs, Cartesian) can be added here
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
