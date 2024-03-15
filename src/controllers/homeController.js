import connection from "../config/connectDB";
import jwt from "jsonwebtoken";
import md5 from "md5";
import e from "express";
require("dotenv").config();

const homePage = async (req, res) => {
  const [settings] = await connection.query(
    "SELECT `app`, `notice` FROM admin"
  );
  let app = settings[0].app;
  let notice = settings[0].notice;
  return res.render("home/index.ejs", { app, notice });
};
const gamePage = async (req, res) => {
  const [settings] = await connection.query(
    "SELECT `app`, `notice` FROM admin"
  );
  let app = settings[0].app;
  let notice = settings[0].notice;
  return res.render("home/all.ejs", { app, notice });
};
const getNotice = async (req, res) => {
  const [getNoti] = await connection.query("SELECT `notice` FROM admin");
  let Notice = getNoti[0].notice;
  return res.status(200).json({ Notice: Notice }).end();
};

const checkInPage = async (req, res) => {
  return res.render("checkIn/checkIn.ejs");
};

const checkDes = async (req, res) => {
  return res.render("checkIn/checkDes.ejs");
};

const checkRecord = async (req, res) => {
  return res.render("checkIn/checkRecord.ejs");
};

const checkInDetail = async (req, res) => {
  return res.render("checkIn/checkInDetail.ejs");
};

const checkAttendance = async (req, res) => {
  return res.render("checkIn/checkAttendance.ejs");
};

const addBank = async (req, res) => {
  return res.render("wallet/addbank.ejs");
};
const editBank = async (req, res) => {
  let auth = req.cookies.auth;
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [dataBank] = await connection.query(
    "SELECT * FROM user_bank WHERE `phone` = ? ",
    [userInfo.phone]
  );
  if (dataBank.length == 0) {
    return res.redirect("/wallet/addBank");
  }
  return res.render("wallet/editbank.ejs", { dataBank });
};

// promotion
const promotionPage = async (req, res) => {
  return res.render("promotion/promotion.ejs");
};

const promotionmyTeamPage = async (req, res) => {
  return res.render("promotion/myTeam.ejs");
};

const promotionDesPage = async (req, res) => {
  return res.render("promotion/promotionDes.ejs");
};
//
const promotionLowerData = async (req, res) => {
  return res.render("promotion/prtLowerData.ejs");
};
const promotionRoseDetails = async (req, res) => {
  return res.render("promotion/prtRoseDetails.ejs");
};
const promotionNewRules = async (req, res) => {
  return res.render("promotion/prtNewRules.ejs");
};
const promotionCustomerCare = async (req, res) => {
  return res.render("promotion/prtCustomerCare.ejs");
};
//

const tutorialPage = async (req, res) => {
  return res.render("promotion/tutorial.ejs");
};

const bonusRecordPage = async (req, res) => {
  return res.render("promotion/bonusrecord.ejs");
};

// wallet
const walletPage = async (req, res) => {
  return res.render("wallet/index.ejs");
};

const rechargePage = async (req, res) => {
  return res.render("wallet/recharge.ejs");
};

const rechargerecordPage = async (req, res) => {
  return res.render("wallet/rechargerecord.ejs");
};

const withdrawalPage = async (req, res) => {
  return res.render("wallet/withdrawal.ejs");
};

const withdrawalrecordPage = async (req, res) => {
  return res.render("wallet/withdrawalrecord.ejs");
};

// member page
const mianPage = async (req, res) => {
  let auth = req.cookies.auth;
  const [user] = await connection.query(
    "SELECT `level` FROM users WHERE `token` = ? ",
    [auth]
  );
  let level = user[0].level;
  return res.render("member/index.ejs", { level });
};
const aboutPage = async (req, res) => {
  return res.render("member/about/index.ejs");
};

const privacyPolicy = async (req, res) => {
  return res.render("member/about/privacyPolicy.ejs");
};

const newtutorial = async (req, res) => {
  return res.render("member/newtutorial.ejs");
};

const forgot = async (req, res) => {
  let auth = req.cookies.auth;
  const [user] = await connection.query(
    "SELECT `time_otp` FROM users WHERE token = ? ",
    [auth]
  );
  let time = user[0].time_otp;
  return res.render("member/forgot.ejs", { time });
};

const redenvelopes = async (req, res) => {
  return res.render("member/redenvelopes.ejs");
};

const riskAgreement = async (req, res) => {
  return res.render("member/about/riskAgreement.ejs");
};

const keFuMenu = async (req, res) => {
  let auth = req.cookies.auth;

  const [users] = await connection.query(
    "SELECT `level`, `ctv` FROM users WHERE token = ?",
    [auth]
  );

  let telegram = "";
  if (users.length == 0) {
    let [settings] = await connection.query(
      "SELECT `telegram`, `cskh` FROM admin"
    );
    telegram = settings[0].telegram;
  } else {
    if (users[0].level != 0) {
      var [settings] = await connection.query("SELECT * FROM admin");
    } else {
      var [check] = await connection.query(
        "SELECT `telegram` FROM point_list WHERE phone = ?",
        [users[0].ctv]
      );
      if (check.length == 0) {
        var [settings] = await connection.query("SELECT * FROM admin");
      } else {
        var [settings] = await connection.query(
          "SELECT `telegram` FROM point_list WHERE phone = ?",
          [users[0].ctv]
        );
      }
    }
    telegram = settings[0].telegram;
  }

  return res.render("keFuMenu.ejs", { telegram });
};

const myProfilePage = async (req, res) => {
  return res.render("member/myProfile.ejs");
};

module.exports = {
  homePage,
  gamePage,
  getNotice,
  checkInPage,
  promotionPage,
  walletPage,
  mianPage,
  myProfilePage,
  promotionmyTeamPage,
  promotionDesPage,
  tutorialPage,
  bonusRecordPage,
  keFuMenu,
  rechargePage,
  rechargerecordPage,
  withdrawalPage,
  withdrawalrecordPage,
  aboutPage,
  privacyPolicy,
  riskAgreement,
  newtutorial,
  redenvelopes,
  forgot,
  checkDes,
  checkRecord,
  addBank,
  editBank,
  promotionLowerData,
  promotionRoseDetails,
  promotionNewRules,
  promotionCustomerCare,
  checkInDetail,
  checkAttendance,
};
