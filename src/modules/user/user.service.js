import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { encrypt } from "../../utils/crypto/encryption.js";
import { decrypt } from "../../utils/crypto/decryption.js";
import cloudinary from "../../utils/file upload/cloud-config.js";
import userModel from "../../DB/models/user.model.js";
import { cloudinaryFolders } from "../../utils/cloudFolders.js";

export const updateUser = async (req, res, next) => {
  const { user } = req;

  if (req.body.mobileNumber) {
    req.body.mobileNumber = encrypt({ data: req.body.mobileNumber });
  }

  req.body.updatedBy = req.user._id;

  await user.updateOne(req.body);

  res.status(200).json({ msg: "updated", user });
};

export const updatePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await userModel.findById(req.user._id, { password: 1 });

  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return next(new Error("invalid old password", { cause: 400 }));
  }

  user.password = newPassword;
  await user.save();
  res.status(200).json({ msg: "done" });
};

export const freezeAccount = async (req, res, next) => {
  req.user.deletedAt = Date.now();
  await req.user.save();
  res.status(200).json({ msg: "done" });
};

export const getLoginUserData = async (req, res, next) => {
  res.status(200).json({ msg: "done", user: req.user });
};

export const getAnotherUserData = async (req, res, next) => {
  const user = await userModel
    .findOne({ _id: req.params.id, deletedAt: { $exists: false } })
    .select("firstName lastName mobileNumber email profilePic coverPic");

  return user
    ? res.status(200).json({ msg: "done", user })
    : next(new Error("user not exist ", { cause: 404 }));
};

export const uploadProfilePic = async (req, res, next) => {
  if (req.user.profilePic?.public_id) {
    await cloudinary.uploader.destroy(req.user.profilePic.public_id);
  }

  const { secure_url, public_id } = await cloudinary.uploader.upload(
    req.file.path,
    {
      folder: cloudinaryFolders(req.user._id).userProfilePic,
    }
  );
  const user = await userModel.findByIdAndUpdate(
    req.user._id,
    {
      profilePic: { secure_url, public_id },
    },
    { new: true }
  );
  return res.json({ success: true, data: user });
};

export const uploadCoverPic = async (req, res, next) => {
  if (req.user.coverPic?.public_id)
    await cloudinary.uploader.destroy(req.user.coverPic.public_id);

  const { secure_url, public_id } = await cloudinary.uploader.upload(
    req.file.path,
    {
      folder: cloudinaryFolders(req.user._id).userCoverPic,
    }
  );

  const user = await userModel.findByIdAndUpdate(
    req.user._id,
    {
      coverPic: { secure_url, public_id },
    },
    { new: true }
  );

  return res.json({ success: true, data: user });
};

export const deleteProfilePic = async (req, res, next) => {
  const { user } = req;

  if (!user.profilePic?.public_id)
    return next(new Error("no profile pic exist", { cause: 404 }));

  await cloudinary.uploader.destroy(user.profilePic.public_id);
  user.profilePic = null;
  await user.save();
  return res.json({ message: "Done" });
};

export const deleteCoverPic = async (req, res, next) => {
  const { user } = req;

  if (!user.coverPic?.public_id)
    return next(new Error("no cover pic exist", { cause: 404 }));

  await cloudinary.uploader.destroy(user.coverPic.public_id);
  user.coverPic = null;
  await user.save();
  return res.json({ message: "Done" });
};
