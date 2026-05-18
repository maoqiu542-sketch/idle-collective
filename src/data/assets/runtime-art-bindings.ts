import runtimeMappingJson from '../../../art-pipeline/specs/runtime-mapping.json'

export type RuntimeArtBindings = typeof runtimeMappingJson.mapping

export const runtimeArtBindings = runtimeMappingJson.mapping as RuntimeArtBindings
