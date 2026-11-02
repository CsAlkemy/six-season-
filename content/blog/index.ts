import type { Post } from "@/lib/blog";

import { deshiEggsVsFarmEggs } from "./deshi-eggs-vs-farm-eggs";
import { ghaniMustardOil } from "./ghani-mustard-oil";
import { howToTellPureGhee } from "./how-to-tell-pure-ghee";
import { pureKhejurGur } from "./pure-khejur-gur";

/** The blog's first posts. They show until the admin first saves a post; from then on the saved list is the blog. */
export const DEFAULT_POSTS: Post[] = [howToTellPureGhee, ghaniMustardOil, pureKhejurGur, deshiEggsVsFarmEggs];
