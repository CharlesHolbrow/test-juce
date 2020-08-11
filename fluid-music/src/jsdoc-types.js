
/**
 * A structured musical score encoded with `fluid.tab` notation
 * @typedef {Object.<string,ScoreObject>|Array<ScoreObject>} ScoreObject
 */

/**
 * Session encapsulates the structure of a DAW Session.
 *
 * ```
 * const exampleSession = {
 *   startTime: 0,
 *   duration: 4,
 *   tracks: {
 *     drums: {
 *       clips: [
 *         {
 *           events: [ { startTime 0, length: 0.25, n: 0 } ],
 *           duration: 1,
 *           startTime: 0
 *           midiEvents: [{ startTime: 0, length: 0.25, n: {n: 0, type: 'midiNote'}}],
 *         },
 *         {
 *           events: [ { startTime 0, length: 0.25, n: 1 } ],
 *           duration: 1,
 *           startTime: 1
 *           midiEvents: [{ startTime: 0, length: 0.25, n: {n: 1, type: 'midiNote'}}],
 *         },
 *         {
 *           events: [ { startTime 0, length: 0.25, n: 2 } ],
 *           duration: 1,
 *           startTime: 2
 *           midiEvents: [{ startTime: 0, length: 0.25, n: {n: 2, type: 'midiNote'}}],
 *         },
 *         {
 *           events: [ { startTime 0, length: 0.25, n: 3 } ],
 *           duration: 1,
 *           startTime: 3
 *           midiEvents: [{ startTime: 0, length: 0.25, n: {n: 3, type: 'midiNote'}}],
 *         },
 *       ],
 *       automation: {},
 *     },
 *   },
 *   regions: [
 *     {
 *       startTime: 0,
 *       duration: 2,
 *       regions: [
 *         {
 *           events: [ { startTime 0, length: 0.25, n: 0 } ],
 *           duration: 1,
 *           startTime: 0
 *         },
 *         {
 *           events: [ { startTime 0, length: 0.25, n: 1 } ],
 *           duration: 1,
 *           startTime: 1
 *         }
 *       ]
 *     },
 *     { events: [ { startTime 0, length: 0.25, n: 2 } ], duration: 1, startTime: 2 },
 *     { events: [ { startTime 0, length: 0.25, n: 3 } ], duration: 1, startTime: 3 },
 *   ]
 * }
 * ```
 *
 * @typedef {Object.<string, Session>} Session
 * @property {number} startTime
 * @property {number} duration
 * @property {Session[]} [regions] (Only on sessions created from an array)
 * @property {TracksObject} [tracks] (Only on top level/outermost sessions)
 */

/**
 * Represents a collection of audio tracks, and clips on those tracks.
 *
 * Example of a `TracksObject` containing a single `bass` track, which
 * contains two clips:
 * 1) a MIDI clip and three MIDI notes.
 * 2) a clip that contains an audio file
 * ```javascript
 * {
 *   bass: {
 *     clips: [
 *       {
 *         midiEvents: [
 *           { startTime 0,     length: 0.0833, n: { n: 33, type: 'midiNote' }, d: { v: 100 } },
 *           { startTime 0.25,  length: 0.0833, n: { n: 35, type: 'midiNote' }, d: { v: 90 } },
 *           { startTime 0.33,  length: 0.0833, n: { n: 38, type: 'midiNote' }, d: { v: 60 } },
 *         ],
 *         fileEvents: [
 *           { startTime 0.5, length: 0.25, n: { type: 'file', path: 'media/kick.wav' } },
 *         ],
 *         startTime: 2,
 *         duration:  1,
 *       },
 *       {
 *         events: [],
 *         startTime: 3,
 *         duration:  1,
 *       },
 *     ], // end clips
 *
 *     plugins: [
 *       {
 *         name: 'Podolski.64',
 *         type: 'VST',
 *         automation: {
 *           "VCF0: Cutoff":    { points: [ { startTime: 0, explicitValue: 0.4 } ] },
 *           "VCF0: Resonance": { points: [ { startTime: 0, normalizedValue: 0.5, curve: -0.5 } ] },
 *         },
 *       },
 *     ], // end plugins
 *
 *     automation: { // automation for the track itself (volume, pan)
 *       "volume": { points: [] },
 *       "pan":    { points: [] },
 *     },
 *   },
 * }
 * ```
 * @typedef {Object.<string, Track>} TracksObject
 */

/**
 * @typedef {Object} Track
 * @param {Clip[]} clips
 * @param {PluginInstance[]} plugins
 * @param {string} name The Track name
 * @param {number} [duration]  // Charles: do all Track objects have a duration?
 * @param {number} [startTime] // Charles: do all Track objects have a startTime?
 * @param {Object.<string, Automation>} automation this contains automation
 *    associated with the track. Note that PluginInstance objects have their own
 *    .automation object.
 */

/**
 * @typedef {Object} Clip
 * @property {Event[]} events
 * @property {Event[]} midiEvents
 * @property {Event[]} fileEvents
 * @property {number} duration duration in whole notes
 * @property {number} [startTime] start time in whole notes
 */

/**
 * @typedef {Object} PluginInstance
 * @property {string} name
 * @property {string} [type] VST, VST3, AudioUnit, fluid
 * @property {Object.<string, Automation>} automation
 */

/**
 * @typedef {Object} Automation
 * @property {AutomationPoint[]} points
 */

 /**
  * AutomationPoints must have either an explicitValue or a normalizedValue
  * @typedef {Object} AutomationPoint
  * @property {number} startTime the time in beats
  * @property {number} [curve=0]
  * @property {number} [explicitValue]
  * @property {number} [normalizedValue]
  */

/**
 * Represents a performance marking such as "forte" or "piano". In practice,
 * this specifies a MIDI velocity, or a dBFS gain value.
 *
 * These can be found in a `dLibrary`, or in the `.d` field of a `ScoreEvent`.
 * @typedef {Object} Dynamic
 * @property {number} [v=64] optional midi velocity
 * @property {number} [dbfs] sample gain
 * @property {number} [intensity] performance intensity value between 0 and 1.
 *  intensity may be interpreted several different ways by different note/event
 *  handlers.
 */

 /**
  * Represents a timeline event such as a MIDI note or an audio sample.
  *
  * ```
  * const exampleNotes = [
  * { type: 'midiNote', n: 64 },
  * { type: 'file', path: 'path/to/sample.wav' }
  * ];
  * ```
  *
  * These can be found in an `nLibrary`, or in a Clip
  * @typedef {Object} Event
  * @property {string} type String indicating the type of event:
  *   'file' indicates an audio sample, which should have a `.path`.
  *   'iLayers' indicates the presence of a `.iLayers` field, which contains an
  *    array of EventObjects with `.type === 'file'`. Files in the `.iLayers`
  *    array should be arranged in order of increasing performance intensity.
  * @property {string} [path] file objects must include a path string
  * @property {number} [fadeOutSeconds] fade out in seconds (file objects)
  * @property {number} [fadeInSeconds] fade in in seconds (file objects)
  * @property {boolean} [oneShot] if true, file objects will play until the end,
  *   ignoring the note's length
  * @property {number} [startTime]
  * @property {number} [length]
  * @property {Dynamic} [d]
  */

/**
 * Represents any type of message that can be sent from a client such as
 * `FluidClient` or `FluidUdpClient` to the Fluid Engine.
 *
 * A simple example looks like this:
 * ```javascript
 * const createNote = {
 * address: '/midiclip/insert/note',
 *   args: [
 *     { type: 'integer', value: 60 },
 *     { type: 'float', value: 0 },
 *     { type: 'float', value: 4 },
 *     { type: 'integer', value: 127 },
 *  ]
 * }
 * ```
 *
 * Internally, the `osc-min` npm package is used to convert JS Objects (like the
 * one above) to OSC buffers. See the `osc-min` spec here:
 * https://www.npmjs.com/package/osc-min#javascript-representations-of-the-osc-types
 *
 * `fluid-music` clients automatically convert JavaScript arrays to OSC
 * bundles, so FluidMessage Objects can also be nested arrays of JS objects
 * as long as all objects follow the `osc-min` spec.
 * @typedef {Object|Array} FluidMessage
 */

/**
 * `NoteLibrary` objects are used in fluid music tablature. A `NoteLibrary`
 * maps single character strings (`.length === 1`) to music events (such as
 * notes, chords, values, or annotations) in a music score or MIDI clip.
 * @typedef {Object|Array} NoteLibrary
 */
