import { INPUT_TIMEOUT_TICKS, parseInput, ZERO_INPUT } from '@liquidity/shared';
import type { PilotInput } from '@liquidity/shared';

export class InputGate {
  private lastSeq = -1;
  private lastClientTick = -1;
  private lastReceivedTick = -INPUT_TIMEOUT_TICKS;
  private windowTick = 0;
  private attempts = 0;
  private movement: PilotInput = {...ZERO_INPUT, polarity: 0};
  public ackSeq = -1;
  public rejected = 0;

  receive(value: unknown, serverTick: number): boolean {
    if (serverTick - this.windowTick >= 30) { this.windowTick = serverTick; this.attempts = 0; }
    this.attempts++;
    const input = this.attempts <= 60 ? parseInput(value) : null;
    if (!input || input.seq <= this.lastSeq || input.clientTick < this.lastClientTick) {
      this.rejected++; return false;
    }
    this.lastSeq = input.seq;
    this.lastClientTick = input.clientTick;
    this.lastReceivedTick = serverTick;
    this.movement = {moveX: input.moveX, moveY: input.moveY, polarity: input.polarity};
    return true;
  }

  consume(serverTick: number): PilotInput {
    // Acknowledgement means consumed by a simulation tick, not merely received.
    this.ackSeq = this.lastSeq;
    return serverTick - this.lastReceivedTick >= INPUT_TIMEOUT_TICKS ? {...ZERO_INPUT, polarity: 0} : {...this.movement};
  }
}
