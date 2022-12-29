export function getActorFromToken(tokenID) {
  return canvas.tokens.get(tokenID)?.actor;
};

export async function getActorFromUUID(uuid) {
  const obj = await fromUuid(uuid);

  if (obj instanceof TokenDocument) {
    return obj.actor;
  }
  return obj;
}
