export const sendToken = async (user, res) => {
  const token = user.generateJsonWebToken();
  const tempUser = {
    name: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
  return res
    .status(200)
    .cookie("token", token, {
      expires: new Date(
        Date.now() + Number(process.env.COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      // secure: false, // ✅ set to true ONLY in production with HTTPS
      // sameSite: "Lax", // ✅ prevent CSRF in most case
  secure: true,          // REQUIRED on HTTPS
  sameSite: "none",      // REQUIRED for cross-site
    })
    .json({
      token,
      success: true,
      tempUser,
      message: "You Loged in successful",
    });
};
