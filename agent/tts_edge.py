import asyncio
import os
import edge_tts
from livekit.agents import tts, utils, tokenize
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS

class EdgeTTS(tts.TTS):
    """Zero-latency Microsoft Neural TTS base adapter for LiveKit."""

    def __init__(
        self,
        voice: str = None,
        rate: str = "+4%",
        pitch: str = "+0Hz",
        sample_rate: int = 24000
    ):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=sample_rate,
            num_channels=1,
        )
        self.voice = voice or os.getenv("VOICE_NAME", "en-GB-SoniaNeural")
        self.rate = rate
        self.pitch = pitch

    def synthesize(self, text: str, *, conn_options=None) -> tts.ChunkedStream:
        return EdgeChunkedStream(
            tts_instance=self,
            text=text,
            voice=self.voice,
            rate=self.rate,
            pitch=self.pitch,
            sample_rate=self.sample_rate
        )


class EdgeChunkedStream(tts.ChunkedStream):
    def __init__(
        self,
        tts_instance,
        text: str,
        voice: str,
        rate: str,
        pitch: str,
        sample_rate: int
    ):
        super().__init__(tts=tts_instance, input_text=text, conn_options=DEFAULT_API_CONNECT_OPTIONS)
        self.voice = voice
        self.rate = rate
        self.pitch = pitch
        self.sample_rate = sample_rate

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        output_emitter.initialize(
            request_id=utils.shortuuid(),
            sample_rate=self.sample_rate,
            num_channels=1,
            mime_type="audio/mpeg",
        )
        try:
            communicate = edge_tts.Communicate(
                text=self.input_text,
                voice=self.voice,
                rate=self.rate,
                pitch=self.pitch
            )
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    output_emitter.push(chunk["data"])
        except Exception:
            communicate = edge_tts.Communicate(text=self.input_text, voice=self.voice)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    output_emitter.push(chunk["data"])


def create_edge_tts(voice: str = None, rate: str = "+4%") -> tts.TTS:
    """Wraps EdgeTTS with LiveKit's StreamAdapter for realtime streaming audio output."""
    base_tts = EdgeTTS(voice=voice, rate=rate)
    return tts.StreamAdapter(
        tts=base_tts,
        sentence_tokenizer=tokenize.basic.SentenceTokenizer()
    )
