import { FluidSession } from "./FluidSession";
import { FluidPlugin, Automation } from "./plugin";

export interface Technique {
  use : {(startTime : number, duration : number, context : ClipEventContext) : any }
}

/** An Event is just anything with a startTime and a duration */
export interface Event {
  startTime: number
  duration: number
}

export interface TechniqueEvent extends Event {
  technique : Technique
  d? : DynamicObject
}

export interface MidiNoteEvent extends Event {
  note : number
  velocity : number
}

export interface AudioFileEvent extends Event {
  path : string
  fadeOutSeconds : number
  fadeInSeconds : number
  gainDb : number

  /**
   * When true, the inserted audio file will play to its end instead of obeying
   * event length (default=false)
   */
  oneShot : boolean
  info : AudioFileInfo
  startInSourceSeconds : number
}

/**
 * Audio file details provided by the music-metadata npm package.
 */
export interface AudioFileInfo {
  [key: string] : any
  /** length in seconds */
  duration? : number
  bitsPerSample? : number
  sampleRate? : number
  numberOfChannels? : number
}

export interface DynamicObject {
  [key : string] : any
}

/**
 * @member duration length measured in whole notes
 */
export interface Clip {
  events : TechniqueEvent[];
  midiEvents : MidiNoteEvent[];
  fileEvents : AudioFileEvent[];
  unmappedEvents: any[];
  duration : number;
  startTime? : number;
}

export interface dLibrary { [key: string] : any|any[] }
export interface tLibrary { [key: string] : Technique|Technique[] }

export interface ScoreConfig {
  dLibrary?: dLibrary;
  tLibrary?: tLibrary;
  r?: string;
  d?: string;
}

export interface ScoreObject {
  [key : string] : any | any[];
  [key : number] : any | any[];
};

/**
 * @member gain post-fx gain in dbfs
 * @member pan post-fx pan (-1 to 1)
 * @member duration? length measured in whole notes
 * @member automation? 
 */
export interface Track {
  name: string;
  gain: number;
  pan: number;
  clips: Clip[];
  plugins: FluidPlugin[];
  automation: Automation;
  duration? : number;
  startTime? : number;
}

/**
 * ClipEventContext fields specify the context of the ClipEvent currently being
 * processed, including the track and clip that contain the note.
 */
export interface ClipEventContext {
  d: DynamicObject;

  /**
   * this is a convenient place to store data between .process callbacks. Like
   * the EventContext, it is replaced for each Clip.
   */
  data: { [key: string] : any };
  /** The session containing this track, clip, and event */
  session: FluidSession;
  /** the Clip that contains the current event */
  clip: Clip;
  /** the Track that contains the current event */
  track: Track;
  /** index of the clip within the track */
  clipIndex: number;
  /** index of the event within the clip. */
  eventIndex?: number;
}