export const sendToken = async (user, res) => {
  const token = user.generateJsonWebToken();
  const tempUser = {
    name: user.fullName,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt,
  };
  return res
    .status(200)
    .cookie("token", token, {
      expires: new Date(
        Date.now() + Number(process.env.COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    })
    .json({token, success: true, tempUser, message: "You Loged in successful" });
};
