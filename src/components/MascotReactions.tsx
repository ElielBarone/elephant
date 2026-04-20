export type SplashReactionType = 'default' | 'well-done'

function buildMascotPath(fileName: string) {
  return `${import.meta.env.BASE_URL.replace(/\/+$/, '')}/mascot/${fileName}`
}

const mascotImageByReaction: Record<SplashReactionType, string> = {
  default: buildMascotPath('elephant-mascot.png'),
  'well-done': buildMascotPath('elephant-all-done.png'),
}

export function mascotReactionImage(reactionType: SplashReactionType) {    
  return mascotImageByReaction[reactionType]
}
