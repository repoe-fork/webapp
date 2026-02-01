import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getSpriteSheet } from "lib/minimap";

export const Minimap: React.FC<{
  tile: any;
  x: number;
  y: number;
  rotation: number;
  flip: boolean;
}> = ({ tile, x, y, rotation, flip }) => {
  const path = tile.file.substring(0, tile.file.lastIndexOf("/")).replaceAll(/\W/g, "_");
  const { data: spriteSheet } = useSuspenseQuery(getSpriteSheet(path + ".mtp"));

  if (!spriteSheet) return null;

  // We want to find the sprite that matches our required rotation.
  // MTP rotations are 0, 1, 2, 3 corresponding to R0, R90, R180, R270?
  // Let's assume mtp rotation 1 = 90 deg clockwise.
  const mtpRotation = rotation / 90;

  const sprites = spriteSheet.records.filter(
    ({ filename, rotation: r }) =>
      tile.file.toLowerCase() === filename?.toLowerCase() && r === mtpRotation,
  );

  const sprite = sprites[0];
  if (!sprite?.filename) return null;

  const width = sprite.right - sprite.left;
  const height = sprite.bottom - sprite.top;

  // Apply flip if needed. Since SVG doesn't have a simple flip, we use transform.
  // We center the image horizontally around 'x' which is the top corner of the isometric diamond.
  const imageX = x - width / 2;
  const imageY = y;
  const transform = flip ? `translate(${x}, ${y}) scale(-1, 1) translate(${-x}, ${-y})` : undefined;

  return (
    <image
      href={`https://i.ggpk.exposed/poe2/minimap/${path}.dds?x=${sprite.left}&y=${sprite.top}&w=${width}&h=${height}`}
      x={imageX}
      y={imageY}
      width={width}
      height={height}
      transform={transform}
    />
  );
};