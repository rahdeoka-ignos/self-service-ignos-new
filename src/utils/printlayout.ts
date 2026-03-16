export const PRINT_WIDTH = 1200;
export const PRINT_HEIGHT = 1800;

export const PRINT_PADDING = 60;
export const PRINT_GAP = 40;

export function getLayout4() {
  const w = (PRINT_WIDTH - PRINT_PADDING * 2 - PRINT_GAP) / 2;
  const h = (PRINT_HEIGHT - PRINT_PADDING * 2 - PRINT_GAP) / 2;

  return { w, h };
}
