"""Deterministic clock for retry and rate-limit exercises."""

from dataclasses import dataclass, field


@dataclass
class FakeClock:
    """Advance time only when code explicitly sleeps."""

    now: float = 0.0
    sleeps: list[float] = field(default_factory=list)

    def sleep(self, seconds: float) -> None:
        if seconds < 0:
            raise ValueError("sleep duration cannot be negative")
        self.sleeps.append(float(seconds))
        self.now += float(seconds)

    def time(self) -> float:
        return self.now
