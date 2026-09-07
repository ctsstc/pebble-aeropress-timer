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

int32_t chime_set_note(uint32_t index, uint32_t midi) {
  if (index >= CHIME_MAX_NOTES || midi > 127) return 0;
  s_notes[index].midi_note = (uint8_t)midi;
  return 1;
}

int32_t chime_play(uint32_t count, uint32_t duration_ms, uint32_t volume) {
  if (count == 0 || count > CHIME_MAX_NOTES || duration_ms > 10000 || volume > 100) return 0;
  for (uint32_t i = 0; i < count; i++) {
    s_notes[i].waveform = SpeakerWaveformSine;
    s_notes[i].duration_ms = (uint16_t)duration_ms;
    s_notes[i].velocity = 0;
    s_notes[i].reserved = 0;
  }
  return speaker_play_notes(s_notes, count, (uint8_t)volume) ? 1 : 0;
}

#else

int32_t chime_muted(void) { return 1; }
int32_t chime_set_note(uint32_t index, uint32_t midi) { return 0; }
int32_t chime_play(uint32_t count, uint32_t duration_ms, uint32_t volume) { return 0; }

#endif
