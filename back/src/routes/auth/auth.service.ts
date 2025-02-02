import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { IOToken } from "../../interface/token.interface";
import { BlackList } from "../../models/user/blacklist.model";
import { OToken } from "../../models/user/otoken.model";
import { Profile } from "../../models/user/profile.model";
import { Token } from "../../models/user/token.model";
import { User } from "../../models/user/user.model";
import { getIsoString } from "../../module/time";
import { accessToken, issueJwt, jwtToObject, tokenToUser } from "./oauth";
import * as search from "../../module/search";
import * as awsS3 from "../../module/aws/s3";

const userModelCheck = async (user: any): Promise<number> => {
  var temp;
  var u = user.cursus_users.filter((x: any) => x.cursus_id == 21)[0];
  if ((temp = await User.findOne({ where: { intraId: user.id } }))) {
    await Profile.update(
      { level: u.level },
      { where: { userId: temp.id } }
    );
    search.updateUser({ level: u.level }, { id: temp.id });
    return temp.id;
  }
  const row = await User.create({
    intraId: user.id,
    username: user.login,
    name: user.displayname,
    email: user.email,
    location: user.campus[0].name,
    profileImage: user.image_url,
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
    level: u.level,
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
  search.insertUser({
    id: row.id,
    username: row.username,
    profileImage: row.profileImage,
    blurImage: "",
    status: 0,
    position: 0,
    skill: [],
    level: u.level,
    statusMessage: "",
  });
  await awsS3.profileToS3(row.id, user.image_url);
  return row.id;
};

export const signIn = async (request: Request, response: Response) => {
  const { code, refresh_token } = request.query;
  if (code) {
    const token: boolean | IOToken = await accessToken(code.toString());
    if (!token) {
      response.status(401).json({ error: "invalid code" });
      return;
    }
    const user = await tokenToUser((<IOToken>token).access_token);
    if ((<any>user).cursus_users.length < 2) {
      response.status(400).json({ error: "service can only used by cadets" });
      return;
    }
    if (!user) {
      response.status(400).json({ error: "42 intra is not working" });
      return;
    }
    const idx = await userModelCheck(user);
    await OToken.update(
      {
        accessToken: (<IOToken>token).access_token,
        refreshToken: (<IOToken>token).refresh_token,
        expiryDate: (<IOToken>token).created_at + (<IOToken>token).expires_in,
      },
      { where: { userId: idx } }
    );
    var expiringToken: Token | null;
    if (
      (expiringToken = await Token.findOne({ where: { userId: idx } }))
        ?.accessToken !== null
    ) {
      await BlackList.create({
        token: expiringToken?.accessToken,
        expiryDate: expiringToken?.accessExpiry,
      });
      await BlackList.create({
        token: expiringToken?.refreshToken,
        expiryDate: expiringToken?.refreshExpiry,
      });
    }
    const jwt = issueJwt(idx);
    await Token.update(
      {
        accessToken: jwt.accessToken,
        accessExpiry: jwt.accessExpiry,
        refreshToken: jwt.refreshToken,
        refreshExpiry: jwt.refreshExpiry,
      },
      { where: { userId: idx } }
    );
    const meta = await User.findOne({ where: { id: idx } });
    response.status(200).json({
      user: {
        id: meta!.id,
        username: meta!.username,
        profileImage: meta!.profileImage,
        location: meta!.location,
        email: meta!.email,
      },
      token: jwt,
    });
    return;
  }
  if (refresh_token) {
    var payload;
    if (
      (await BlackList.findOne({ where: { token: refresh_token } })) ||
      !(payload = jwtToObject(refresh_token.toString(), { subject: "refresh" }))
    ) {
      response.status(401).json({ error: "invalid token" });
      return;
    }
    const jwt = issueJwt((<JwtPayload>payload).uid);
    const expiredToken = await Token.findOne({
      where: { userId: (<JwtPayload>payload).uid },
      include: {
        model: User,
        where: {
          id: (<JwtPayload>payload).uid,
        },
      },
    });
    await BlackList.create({
      token: expiredToken?.accessToken,
      expiryDate: expiredToken?.accessExpiry,
    });
    await BlackList.create({
      token: expiredToken?.refreshToken,
      expiryDate: expiredToken?.refreshExpiry,
    });
    await Token.update(
      {
        accessToken: jwt.accessToken,
        accessExpiry: jwt.accessExpiry,
        refreshToken: jwt.refreshToken,
        refreshExpiry: jwt.refreshExpiry,
      },
      { where: { userId: (<JwtPayload>payload).uid } }
    );
    response.status(200).json(jwt);
    return;
  }
  response.status(400).json({ error: "query required do not exist" });
};

export const signOut = async (request: Request, response: Response) => {
  const expiredToken = await Token.findOne({
    where: { userId: request.user?.id },
    include: {
      model: User,
      where: {
        id: request.user?.id,
      },
    },
  });
  await BlackList.create({
    token: expiredToken?.accessToken,
    expiryDate: expiredToken?.accessExpiry,
  });
  await BlackList.create({
    token: expiredToken?.refreshToken,
    expiryDate: expiredToken?.refreshExpiry,
  });
  await Token.update(
    {
      accessToken: null,
      accessExpiry: null,
      refreshToken: null,
      refreshExpiry: null,
    },
    { where: { userId: request.user?.id } }
  );
  response.status(200).json({ message: "successfully signed out" });
};
