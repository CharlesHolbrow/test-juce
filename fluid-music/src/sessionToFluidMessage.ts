import { basename } from 'path'
import { FluidPlugin, PluginType } from './plugin';
import { Tap } from './fluid-interfaces';
import { FluidTrack } from './FluidTrack'
import { FluidSession } from './FluidSession';
import { FluidAudioFile, resolveFades } from './FluidAudioFile'
import * as cybr from './cybr/index';

// This amplification conversion is hard-coded in Tracktion
const normalizeTracktionGain = (db) => {
  const normalized = Math.exp((db-6) * (1/20));
  return Math.max(Math.min(normalized, 1), 0);
}

const isSubmixTrack = (track : FluidTrack) => {
  return !!track.children.length
}
const createSelectMessage = (track : FluidTrack, parentName? : string) => {
  return isSubmixTrack(track)
    ? cybr.audiotrack.selectSubmixTrack(track.name, parentName)
    : cybr.audiotrack.select(track.name, parentName)
}

/**
 * Create a fluid message that constructs the template of the project without
 * any content. This includes Tracks (with pan and gain) plugins (with state)
 * but no clips or automation.
 * @param session
 */
export function sessionToTemplateFluidMessage(session : FluidSession) {
  const sessionMessages : any[] = [
    cybr.tempo.set(session.bpm),
  ];

  session.forEachTrack((track, i, ancestors) => {
    // Create a sub-message for each track
    const parentName = ancestors.length ? ancestors[ancestors.length - 1].name : undefined
    const trackMessages : any[] = [
      createSelectMessage(track, parentName),
      cybr.audiotrack.gain(track.gainDb), // normalization not needed with .gain
      cybr.audiotrack.pan(track.pan),
    ];
    sessionMessages.push(trackMessages);
  })

  session.forEachTrack((track, i, ancestors) => {
    const parentName = ancestors.length ? ancestors[ancestors.length - 1].name : undefined
    const trackMessages : any[] = [createSelectMessage(track, parentName)]
    sessionMessages.push(trackMessages)

    // Handle plugins. This deals with plugin state (not automation)
    const count : any = {};
    const nth = (plugin : FluidPlugin) => {
      const str = plugin.pluginName + '|' + plugin.pluginType;
      if (!count.hasOwnProperty(str)) count[str] = 0;
      return count[str]++;
    }
    const allPluginMessages : any[] = []
    trackMessages.push(allPluginMessages)

    for (const plugin of track.plugins) {
      const pluginMessages : any[] = []
      allPluginMessages.push(pluginMessages)

      const cybrType = plugin.pluginType === PluginType.unknown ? null : plugin.pluginType
      pluginMessages.push(cybr.plugin.select(plugin.pluginName, cybrType, nth(plugin)))

      // set parameters
      for (const [paramKey, explicitValue] of Object.entries(plugin.parameters)) {
        const paramName = plugin.getParameterName(paramKey);
        if (typeof explicitValue === 'number') {
          const normalizedValue = plugin.getNormalizedValue(paramKey, explicitValue);
          if (typeof normalizedValue === 'number') {
            pluginMessages.push(cybr.plugin.setParamNormalized(paramName, normalizedValue));
          } else {
            pluginMessages.push(cybr.plugin.setParamExplicit(paramName, explicitValue));
          }
        } else {
          console.warn(`found non-number parameter value in ${plugin.pluginName} - ${paramKey}: ${explicitValue}`);
        }
      }

      // check for side chain routing
      if (plugin.sidechainReceive) {
        pluginMessages.push(cybr.plugin.setSidechainInput(plugin.sidechainReceive.from.name))
        if (plugin.sidechainReceive.gainDb !== 0) {
          console.warn(`${plugin.pluginName} on ${track.name} track has non-zero sidechain gain, but this type of gain is not supported by tracktion`)
        }
        if (plugin.sidechainReceive.tap !== Tap.postFader) {
          console.warn(`${plugin.pluginName} on ${track.name} track has non post-fader Tap, but tracktion only supports post-fader sidechain input`)
        }
      }
    }
  })

  // Now that the tracks have been created, iterate over them again, adding
  // sends and receives as needed
  session.forEachTrack(track => {
    if (!track.receives.length) return;

    const sendReceiveMessage = [] as any[]
    sessionMessages.push(sendReceiveMessage)

    // cybr identifies return tracks by name. at the time of writing, there is
    // no proper way to use two tracks that have the same name, while using one
    // of those tracks as a return.

    sendReceiveMessage.push(cybr.audiotrack.selectReturnTrack(track.name))
    for (const receive of track.receives) {
      sendReceiveMessage.push(
        cybr.audiotrack.select(receive.from.name),
        cybr.audiotrack.send(track.name, receive.gainDb)
      )
    }
  })

  return sessionMessages;
}

/**
 * Create a `FluidMessage` from a `FluidSession`
 *
 * @param session object generated by score.parse
 */
export function sessionToContentFluidMessage(session : FluidSession) {
  const sessionMessages : any[] = [];

  session.forEachTrack((track, i, ancestors) => {
    const parentName = ancestors.length ? ancestors[ancestors.length - 1].name : undefined
    const isSubmix = isSubmixTrack(track)

    // Create a sub-message for each track
    let trackMessages : any[] = []
    sessionMessages.push(trackMessages)
    trackMessages.push(createSelectMessage(track, parentName))
    trackMessages.push(fileEventsToFluidMessage(track.audioFiles, session))
    if (isSubmix && track.audioFiles.length) {
      throw new Error(`sessionToTemplateFluidMessage: ${track.name} track has file events and child tracks, but tracktion does not allow events directly on submix tracks`)
    }

    track.clips.forEach((clip, clipIndex) => {
      if (isSubmix && clip.midiEvents.length) {
        // Charles: The best thing to do is probably to have some system that
        // creates an additional track, and puts the clips on it. However, I'm
        // not going to add that until it is clearly needed.
        throw new Error(`sessionToTemplateFluidMessage: ${track.name} track has both MIDI clips and child tracks, but tracktion does not allow clips directly on submix tracks`)
      }

      // Create one EventContext object for each clip.
      if (clip.midiEvents && clip.midiEvents.length) {
        // Create a sub-message for each clip. Note that the naming convention
        // gets a little confusing, because we do not yet know if "clip" contains
        // a single "Midi Clip", a collection of audio file events, or both.
        const clipMessages : any[] = [];
        trackMessages.push(clipMessages);
        const clipName  = `${track.name} ${clipIndex}`
        clipMessages.push(cybr.midiclip.select(clipName, clip.startTime, clip.duration))
        clipMessages.push(clip.midiEvents.map(event => {
          // Velocity in the event takes priority over velocity in the .d object
          const velocity = (typeof event.velocity === 'number')
            ? event.velocity
            : undefined
          return cybr.midiclip.note(event.note, event.startTime, event.duration, velocity);
        }))
      }
    }); // track.clips.forEach

    // Handle track specific automation.
    for (const [name, automation] of Object.entries(track.automation)) {
      let trackAutoMsg : any[] = [];
      trackMessages.push(trackAutoMsg);

      for (const autoPoint of automation.points) {
        if (typeof autoPoint.value === 'number') {
          let msg : any = null;
          if (name === 'gain' || name === 'gainDb')  msg = cybr.audiotrack.gain(autoPoint.value, autoPoint.startTime, autoPoint.curve);
          else if (name === 'pan')   msg = cybr.audiotrack.pan(autoPoint.value, autoPoint.startTime, autoPoint.curve);
          else if (name === 'width') msg = cybr.audiotrack.width(autoPoint.value, autoPoint.startTime, autoPoint.curve);
          else throw new Error(`Fluid Track Automation found unsupported parameter: "${name}"`);
          trackAutoMsg.push(msg);
        }
      }
    } // for [name, automation] of track.automation

    // Handle plugins/plugin automation
    const count : any = {};
    const nth = (plugin : FluidPlugin) => {
      const str = plugin.pluginName + '|' + plugin.pluginType;
      if (!count.hasOwnProperty(str)) count[str] = 0;
      return count[str]++;
    }
    for (const plugin of track.plugins) {
      const cybrType = (plugin.pluginType === PluginType.unknown) ? undefined : plugin.pluginType;
      const pluginName = plugin.pluginName;
      trackMessages.push(cybr.plugin.select(pluginName, cybrType, nth(plugin)));

      // Plugin Parameter Automation
      for (const [paramKey, automation] of Object.entries(plugin.automation)) {
        const paramName = plugin.getParameterName(paramKey); // JUCE style name
        // iterate over points. Ex { startTime: 0, value: 0.5, curve: 0 }
        for (const autoPoint of automation.points) {
          if (typeof autoPoint.value === 'number') {
            // - paramName is the JUCE style parameter name we need
            // - value is an explicit value. look for a normalizer
            // Notice how paramKey and paramName are used in the code below, and
            // be careful not to mix them up. They may (or may not) be identical
            // so mixing them up could lead to hard-to-find bugs.
            const explicitValue   = autoPoint.value;
            const normalizedValue = plugin.getNormalizedValue(paramKey, explicitValue);

            if (typeof normalizedValue === 'number') {
              trackMessages.push(cybr.plugin.setParamNormalizedAt(
                paramName,
                Math.max(Math.min(normalizedValue, 1), 0),
                autoPoint.startTime,
                autoPoint.curve));
            } else {
              trackMessages.push(cybr.plugin.setParamExplicitAt(
                paramName,
                explicitValue,
                autoPoint.startTime,
                autoPoint.curve));
            }
          }
        } // for (autoPoint of automation.points)
      }   // for (paramName, automation of plugin.automation)
    }     // for (plugin of track.plugins)
  })      // for (track of tracks)

  return sessionMessages;
};

function fileEventsToFluidMessage(audioFiles : FluidAudioFile[], session : FluidSession) {
  return audioFiles.map((audioFile, eventIndex) => {

    const startTime = session.timeSecondsToWholeNotes(audioFile.startTimeSeconds)
    const duration = session.timeSecondsToWholeNotes(audioFile.durationSeconds)

    if (typeof audioFile.path !== 'string') {
      console.error(audioFile);
      throw new Error(`fileEventsToFluidMessage: A file event is missing a .path string ${JSON.stringify(audioFile)}`);
    };

    const clipName = `s${basename(audioFile.path)}.${eventIndex}`;
    const msg = [cybr.audiotrack.insertWav(clipName, startTime, audioFile.path)];

    if (audioFile.startInSourceSeconds)
      msg.push(cybr.clip.setSourceOffsetSeconds(audioFile.startInSourceSeconds));

    msg.push(cybr.clip.length(duration));

    const { fadeInSeconds, fadeOutSeconds, gainDb } = resolveFades(audioFile)

    // apply fade in/out times (if specified)
    if (fadeOutSeconds || fadeInSeconds) {
      msg.push(cybr.audioclip.fadeInOutSeconds(fadeInSeconds, fadeOutSeconds));
    }

    if (gainDb) {
      msg.push(cybr.audioclip.gain(gainDb));
    }

    return msg;
  });
}
