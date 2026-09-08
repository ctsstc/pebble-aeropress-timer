#include <pebble.h>

// FFI shim for the speaker (bindings declared in src/embeddedjs/manifest.json).
// Integers only: FFI pointer and string arguments fault on PebbleOS 4.33, so JS
// stages notes one index at a time and then calls chime_play.
// Returns int32 0/1 because the FFI type list has no bool.

#ifdef SPEAKER_MAX_NOTES

#define CHIME_MAX_NOTES 16

static SpeakerNote s_notes[CHIME_MAX_NOTES];

int32_t chime_muted(void) {
  return speaker_is_muted() ? 1 : 0;
}

int32_t chime_set_note(uint32_t index, uint32_t midi, uint32_t duration_ms) {
  if (index >= CHIME_MAX_NOTES || midi > 127 || duration_ms > 10000) return 0;
  s_notes[index] = (SpeakerNote){
    .midi_note = (uint8_t)midi,
    .waveform = SpeakerWaveformSine,
    .duration_ms = (uint16_t)duration_ms,
    .velocity = 0,
  };
  return 1;
}

int32_t chime_play(uint32_t count, uint32_t volume) {
  if (count == 0 || count > CHIME_MAX_NOTES || volume > 100) return 0;
  return speaker_play_notes(s_notes, count, (uint8_t)volume) ? 1 : 0;
}

#else

int32_t chime_muted(void) { return 1; }
int32_t chime_set_note(uint32_t index, uint32_t midi, uint32_t duration_ms) { return 0; }
int32_t chime_play(uint32_t count, uint32_t volume) { return 0; }

#endif
