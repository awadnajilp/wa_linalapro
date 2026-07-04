export interface VoiceProvider {
  id: string; // 'sarvam' | 'elevenlabs' | 'cartesian'
  name: string;

  /** Transcribe speech audio to text */
  transcribe(audioBuffer: Buffer, languageCode?: string, options?: { apiKey?: string }): Promise<string>;

  /** Synthesize text to speech (returns raw audio buffer) */
  synthesize(text: string, voiceId: string, languageCode?: string, options?: { apiKey?: string }): Promise<Buffer>;

  /** Clone a voice profile from audio buffer */
  cloneVoice(name: string, audioBuffer: Buffer, options?: { apiKey?: string }): Promise<string>; // returns voiceId
}
