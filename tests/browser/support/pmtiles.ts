import { zxyToTileId } from "pmtiles";

/** A minimal real PMTiles v3 archive around the existing Paris MVT fixture. */
export function singleTileArchive(tile: Buffer) {
  const values = [1, zxyToTileId(14, 8298, 5636), 1, tile.length, 1];
  const varints: number[] = [];
  for (let value of values) {
    while (value >= 128) {
      varints.push((value % 128) + 128);
      value = Math.floor(value / 128);
    }
    varints.push(value);
  }
  const directory = Buffer.from(varints);
  const header = Buffer.alloc(127);
  header.write("PMTiles");
  header[7] = 3;
  for (const [offset, value] of [
    [8, 127],
    [16, directory.length],
    [24, 127 + directory.length],
    [32, 2],
    [56, 129 + directory.length],
    [64, tile.length],
    [72, 1],
    [80, 1],
    [88, 1],
  ])
    header.writeBigUInt64LE(BigInt(value), offset);
  header.fill(1, 96, 100); // clustered, no compression, MVT
  header[100] = header[101] = 14;
  header.writeInt32LE(-180 * 1e7, 102);
  header.writeInt32LE(-85 * 1e7, 106);
  header.writeInt32LE(180 * 1e7, 110);
  header.writeInt32LE(85 * 1e7, 114);
  return Buffer.concat([header, directory, Buffer.from("{}"), tile]);
}
