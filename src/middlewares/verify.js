const jwt = require("jsonwebtoken");
const User = require("../models/user");
require("dotenv").config();
const { JWT_SECRET_CODE, OAUTH_CLIENT_ID } = process.env;
const { OAuth2Client } = require("google-auth-library");

async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader)
            return res.status(403).json({ message: "Token no recibido" });
        let token = authHeader.split(" ")[1];
        const isGoogleUser = token.slice(0, 6);

        if (isGoogleUser === "google") {
            const googleToken = token.substring(6);

            const client = new OAuth2Client(OAUTH_CLIENT_ID);
            try {
                const ticket = await client.verifyIdToken({
                    idToken: googleToken,
                    audience: OAUTH_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                const { sub } = payload;

                const userFound = await User.findOne({ email: sub });
                if (!userFound) {
                    return res.status(404).json({ message: "Cuenta no encontrada" });
                }

                req.user = {
                    _id: userFound._id,
                    isGoogleUser: true,
                };
            } catch (error) {
                if (error.name === "TokenExpiredError")
                    return res.status(403).json({
                        message: "Sesión expirada, vuelve a iniciar sesión",
                        expiredToken: true,
                    });

                return res.status(403).send("Credenciales inválidas");
            }
        } else {
            try {
                const userDecoded = await jwt.verify(token, JWT_SECRET_CODE);

                req.user = userDecoded.user;
                req.user.isGoogleUser = false;

                const userFound = await User.findById(req.user._id);
                if (!userFound) {
                    return res.status(404).json({ message: "Cuenta no encontrada" });
                }
            } catch (error) {
                if (error.name === "TokenExpiredError")
                    return res.status(403).json({
                        message: "Sesión expirada, vuelve a iniciar sesión",
                        expiredToken: true,
                    });

                return res.status(403).json({ message: "Token inválido" });
            }
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: "Sin autorización" });
    }
}

async function verifyEmailVerified(req, res, next) {
    if (req.user.isGoogleUser) return next(); //! VOLVER A VER ¿pedir email_verified de google?

    const user = await User.findById(req.user._id);
    if (user.emailVerified === true) {
        return next();
    } else {
        return res.json({
            message: "Verifica tu email para tener autorización",
            error: true,
        });
    }
}

async function verifyAdmin(req, res, next) {
    //   if (req.user.isGoogleUser)
    //     return res.status(401).json({ message: "Sin autorización" });

    const user = await User.findById(req.user._id);
    if (user.role === "admin" || user.role === "superadmin") {
        next();
    } else {
        return res.status(401).json({ message: "Sin autorización" });
    }
}

async function verifySuperAdmin(req, res, next) {
    if (req.user.isGoogleUser)
        res.status(401).json({ message: "Sin autorización" });

    const user = await User.findById(req.user._id);
    if (user.role === "superadmin") {
        next();
    } else {
        return res.status(401).json({ message: "Sin autorización" });
    }
}

async function googleUserShallNotPass(req, res, next) {
    if (req.user.isGoogleUser) {
        return res
            .status(401)
            .json({ message: "Cuenta de Google sin autorización" });
    } else {
        next();
    }
}

module.exports = {
    verifyToken,
    verifyEmailVerified,
    verifyAdmin,
    verifySuperAdmin,
    googleUserShallNotPass,
};