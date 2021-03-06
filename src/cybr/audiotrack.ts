/**
 * Select an audio track by name
 * @param {string} trackName
 */
export function select(trackName : string, parent? : string) {
  if (typeof trackName !== 'string')
    throw new Error('audiotrack.Select requires track name string, got: ' + trackName);

  const args = [{ type: 'string', value: trackName }]

  if (typeof parent === 'string')
    args.push({ type: 'string', value: parent })

  return { address: '/audiotrack/select', args }
}

/**
 * Insert and select an audio file clip into the selected audio track. Noop
 * when there is no selected track.
 * @param {string} clipName name the new clip
 * @param {number} startTimeSeconds clip start time in quarter notes
 * @param {string} fileName
 */
export function insertWav (clipName : string, startTimeSeconds : number, fileName : string) {
  if (typeof clipName !== 'string')
    throw new Error('audiotrack.insertWav: clipName must be a string');
  if (typeof startTimeSeconds !== 'number')
    throw new Error('audiotrack.insertWav: start time must be a number');
  if (typeof fileName !== 'string')
    throw new Error('audiotrack.insertWav: fileName must be a string');

  const args = [
    {type: 'string', value: clipName},
    {type: 'string', value: fileName},
    {type: 'double', value: startTimeSeconds},
  ];
  return { address: '/audiotrack/insert/wav', args };
}

/**
 * Selects a track, ensuring that it has a bus return. Afterwords, other
 * tracks can add sends that target the track selected with this method.
 *
 * Use the audiotrack.send method to send from other tracks to a return.
 *
 * @param {string} busName - name of audiotrack (the return will be named
 *                           after the audio track).
 */
export function selectReturnTrack(busName : string) {
  if (typeof busName !== 'string')
    throw new Error('selectReturnTrack requires track name string, got: ' + busName);

  const args = [{ type: 'string', value: busName }]

  return { address: '/audiotrack/select/return', args }
}

export function selectSubmixTrack(name: string, parent? : string) {
  if (typeof name !== 'string')
    throw new Error('selectSubmixTrack requires a name string')
  
  const args = [{ type: 'string', value: name }]

  if (typeof parent === 'string')
    args.push({ type: 'string', value: parent })

  return { address: '/audiotrack/select/submix', args }
}

/**
 * Adjust the send level to the specified bus, adding the send (post-gain) if it
 * does not yet exist. Use with audiotrack.selectReturnTrack(busName).
 *
 * As of cybr 0.3.0, this will also select the aux send plugin. To select the
 * aux send plugin without setting the gain, omit the levelDb parameter.
 *
 * @param {string} busName The name of the return bus to send to
 * @param {number} [levelDb] If not supplied, the aux send plugin on the server
 * will be selected, but not changed. If it needs to be created, it will be set
 * to 0dBFS
 */
export function send(busName : string, levelDb? : number) {
  if (typeof busName !== 'string')
    throw new Error('send requires track name string, got: ' + busName);

  if (levelDb !== undefined && typeof levelDb !== 'number')
    throw new Error('if send has a levelDb, it must be a number');

  const args : any[] = [
    { type: 'string', value: busName },
    { type: 'string', value: 'ignored'}, // just select the send plugin
    { type: 'string', value: 'post-gain'},
  ];

  if (typeof levelDb === 'number')
    args[1] = { type: 'float', value: levelDb };

  return { address: '/audiotrack/send/set/db', args };
}

/**
 * Mute or unmute the selected audio track.
 * @param {boolean} [mute=true] true if track should be muted. false = unmute.
 */
export function mute(mute = true) {
  if (mute) return { address: '/audiotrack/mute'};
  else return { address: '/audiotrack/unmute'};
}

/**
 * Unmute the selected audio track.
 */
export function unmute() {
  return { address: '/audiotrack/unmute'};
}

/**
 * Adjust the track gain or add a gain automation point.
 *
 * When adjusting gain, set the gain of the the last volume plugin on the
 * track's PluginList. When adding volume automation, adjust the second last
 * volume parameter, creating it if needed.
 * @param dbfs
 * @param startTimeSeconds When present, insert an automation point instead
 *    of setting the parameter directly
 * @param curve (default) 0=linear, -1=startFast, 1=startSlow
 */
export function gain(dbfs : number, startTimeSeconds? : number, curve? : number) {
  if (typeof dbfs !== 'number')
    throw new Error('audiotrack.gain requires a number in dbfs');

  const args = [ { type: 'float', value:  dbfs} ];

  if (typeof startTimeSeconds === 'number') {
    args.push({ type: 'double', value: startTimeSeconds });
    if (typeof curve === 'number') {
      args.push({ type: 'float', value: curve });
    }
  }
  return { address: '/audiotrack/set/db', args };
}

/**
 * Set the pan, or add a pan automation point
 * @param bipolar stereo pan position -1=hardLeft, 1=hardRight
 * @param startTimeSeconds When present, insert an automation point instead
 *    of setting the parameter directly
 * @param curve (default) 0=linear, -1=startFast, 1=startSlow
 */
export function pan(bipolar : number, startTimeSeconds? : number, curve? : number) {
  if (typeof bipolar !== 'number')
    throw new Error('audiotrack.pan requires a number');

  const args = [ { type: 'float', value:  Math.max(Math.min(bipolar, 1), -1)} ];
  if (typeof startTimeSeconds === 'number') {
    args.push({ type: 'double', value: startTimeSeconds });
    if (typeof curve === 'number') {
      args.push({ type: 'float', value: curve });
    }
  }

  return { address: '/audiotrack/set/pan', args };
}

/**
 * Set the track width, or add a width automation point
 * @param bipolar 1=default, 0=mono, -1=stereoInvert
 * @param startTimeInSeconds When present, insert an automation point instead
 *    of setting the parameter directly
 * @param curve (default) 0=linear, -1=startFast, 1=startSlow
 */
export function width(bipolar : number, startTimeInSeconds? : number, curve? : number) {
  const args = [ { type: 'float', value:  Math.max(Math.min(bipolar, 1), -1)} ];
  if (typeof startTimeInSeconds === 'number') {
    args.push({ type: 'double', value: startTimeInSeconds });
    if (typeof curve === 'number') {
      args.push({ type: 'float', value: curve });
    }
  }
  return { address: '/audiotrack/set/width', args };
}

/**
 * Render a region of the track to an audio file. If no time range is
 * supplied, the engine should use the loop time range.
 *
 * @param {string} outFilename output filename
 * @param {number} [startTimeSeconds] start time in seconds
 * @param {number} [durationSeconds] duration in seconds
 */
export function renderRegion(outFilename, startTimeSeconds, durationSeconds) {
  if (typeof outFilename !== 'string')
    throw new Error('audiotrack.renderRegion requires a outputFilename string');

  const args : any[] = [{ type: 'string', value: outFilename }];

  if (startTimeSeconds !== undefined || durationSeconds !== undefined) {
    if (typeof startTimeSeconds !== 'number' ||
        typeof durationSeconds !== 'number')
    {
      const msg =
        'An invalid time range was supplied to renderRegion: ' +
        'Both start and duration values must be numbers.';
      throw new Error(msg);
    }
  }

  if (typeof startTimeSeconds === 'number') {
    args.push({ type: 'double', value: startTimeSeconds });
    args.push({ type: 'double', value: durationSeconds });
  }

  return { args, address: '/audiotrack/region/render' };
}

/**
 * Remove all clips (ex. audio, midi clips) from the selected audio track.
 */
export function removeClips() {
  return { address: '/audiotrack/remove/clips' };
}

/**
 * Remove all automation from the track and from all the tracks plugins.
 */
export function removeAutomation() {
  return { address: '/audiotrack/remove/automation'};
}
