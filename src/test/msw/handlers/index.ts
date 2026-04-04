import { thornodeHandlers } from './thornode';
import { midgardHandlers } from './midgard';

export const handlers = [...thornodeHandlers, ...midgardHandlers];

export { thornodeHandlers } from './thornode';
export { midgardHandlers } from './midgard';
