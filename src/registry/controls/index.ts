import type { ControlPlugin } from '../types';
import { ControlRegistry } from '../ControlRegistry';
import text from './text';
import textbox from './textbox';
import datetime from './datetime';
import single from './single';
import multi from './multi';
import rating from './rating';
import slider from './slider';
import arithmetic from './arithmetic';
import gps from './gps';
import fileupload from './fileupload';
import barcode from './barcode';
import photo from './photo';
import video from './video';
import matrix from './matrix';
import matrixSingle from './matrixSingle';
import matrixMulti from './matrixMulti';
import matrixDropdown from './matrixDropdown';
import ranking from './ranking';
import topn from './topn';
import imageChoice from './imageChoice';
import clickmap from './clickmap';
import audio from './audio';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Registration order here drives palette display order within each group.
export const BUILT_IN_PLUGINS: ControlPlugin<any>[] = [
  // content
  text,
  // basic input
  textbox, single, multi, imageChoice, ranking, topn, datetime, fileupload, matrix, matrixSingle, matrixMulti, matrixDropdown,
  // scales
  rating, slider,
  // device capture
  photo, video, audio, barcode, gps, clickmap,
  // computed
  arithmetic,
];

export function createDefaultRegistry(): ControlRegistry {
  const r = new ControlRegistry();
  for (const p of BUILT_IN_PLUGINS) r.register(p as ControlPlugin);
  return r;
}

export const defaultRegistry = createDefaultRegistry();
