import type { Post } from "@/lib/blog";

import { aluBhortaMustardOil } from "./alu-bhorta-mustard-oil";
import { deshiEggsVsFarmEggs } from "./deshi-eggs-vs-farm-eggs";
import { ghaniMustardOil } from "./ghani-mustard-oil";
import { howToBoilDeshiEggs } from "./how-to-boil-deshi-eggs";
import { howToTellPureGhee } from "./how-to-tell-pure-ghee";
import { khejurGurPayesh } from "./khejur-gur-payesh";
import { pureKhejurGur } from "./pure-khejur-gur";
import { whatIsGawaGhee } from "./what-is-gawa-ghee";

/**
 * The blog's first posts. They show until the admin first saves a post; from then on the saved list is the blog, so a
 * post added here later doesn't reach a store that has saved one: it has to be written in the admin (Blog › New post).
 */
export const DEFAULT_POSTS: Post[] = [howToTellPureGhee, ghaniMustardOil, pureKhejurGur, deshiEggsVsFarmEggs, whatIsGawaGhee, khejurGurPayesh, aluBhortaMustardOil, howToBoilDeshiEggs];
