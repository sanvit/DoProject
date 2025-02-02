import express from "express";
import auth from "./auth/auth.controller";
import user from "./user/user.controller";
import project from "./project/project.controller";
import lounge from "./lounge/lounge.controller";
import chat from "./chat/chat.controller";
import search from "./search/search.controller";

import { User } from "../models/user/user.model";
import { OToken } from "../models/user/otoken.model";
import { Token } from "../models/user/token.model";
import { Profile } from "../models/user/profile.model";
import { getIsoString } from "../module/time";
import { insertUser } from "../module/search";
import { push } from "../module/cadetqueue";
import { profileToS3 } from "../module/aws/s3";
import { getUserSocket } from "../socket/bridge";
import { Feed } from "../models/user/feed.mongo";

const router: express.Router = express.Router();

router.use("/auth", auth);
router.use("/user", user);
router.use("/project", project);
router.use("/lounge", lounge);
router.use("/chat", chat);
router.use("/search", search);

/* dump ! */
const makeDump = async (
  username: String,
  name: String,
  email: String,
  profileImage: String
) => {
  const row = await User.create({
    intraId: Math.floor(Math.random() * 99999),
    username: username,
    name: name,
    email: email,
    profileImage: profileImage,
    blurImage: "",
  });
  await OToken.create({
    accessToken: null,
    refreshToken: null,
    expiryDate: null,
    userId: row.id,
  });
  await Token.create({
    accessToken: null,
    accessExpiry: null,
    refreshToken: null,
    refreshExpiry: null,
    userId: row.id,
  });
  await Profile.create({
    level: 1,
    lastAccess: getIsoString(),
    status: 0,
    position: 0,
    skill: [],
    statusMessage: "",
    introduction: "",
    github: null,
    following: [],
    follower: [],
    feed: -1,
    userId: row.id,
  });
  insertUser({
    id: row.id,
    username: row.username,
    profileImage: row.profileImage,
    blurImage: "",
    status: 0,
    position: 0,
    skill: [],
    level: 1,
    statusMessage: "",
  });
  return row.id;
};

router.post("/dump", async (request, response) => {
  const { users } = request.body;
  const res: number[] = [];
  for (const u of users) {
    res.push(await makeDump(u.username, u.name, u.email, u.profileImage));
  }
  response.status(200).json(res);
});

router.post("/feeddump", async (request, response) => {
  const { userId, type, args } = request.body;
  const block = {
    userId: userId,
    date: Date.now(),
    type: type,
    args: args,
  };
  await new Feed(block).save();
  getUserSocket(userId)?.emit("feed:notification", block);
  response.status(200).json({ message: "0" });
});

router.get("/v", (request, response) => {
  response.status(200).send("v1");
});

export default router;
