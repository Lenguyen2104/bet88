import connection from "../config/connectDB";
// import jwt from 'jsonwebtoken'
import md5 from "md5";
import request from "request";
require("dotenv").config();

let timeNow = Date.now();

const randomNumber = (min, max) => {
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};
const verifyCode = async (req, res) => {
  let auth = req.cookies.auth;
  let now = new Date().getTime();
  let timeEnd = +new Date() + 1000 * (60 * 2 + 0) + 500;
  let otp = randomNumber(100000, 999999);

  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!rows) {
    return res.status(200).json({
      message: "Tài khoản không tồn tại",
      status: false,
      timeStamp: timeNow,
    });
  }
  let user = rows[0];
  if (user.time_otp - now <= 0) {
    request(
      `http://47.243.168.18:9090/sms/batch/v2?appkey=NFJKdK&appsecret=brwkTw&phone=84${user.phone}&msg=Your verification code is ${otp}&extend=${now}`,
      async (error, response, body) => {
        let data = JSON.parse(body);
        if (data.code == "00000") {
          await connection.execute(
            "UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ",
            [otp, timeEnd, user.phone]
          );
          return res.status(200).json({
            message: "Gửi thành công",
            status: true,
            timeStamp: timeNow,
            timeEnd: timeEnd,
          });
        }
      }
    );
  } else {
    return res.status(200).json({
      message: "Gửi SMS thường xuyên",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const userInfo = async (req, res) => {
  let auth = req.cookies.auth;

  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );

  if (!rows) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE `phone` = ? AND status = 1",
    [rows[0].phone]
  );

  let totalRecharge = 0;
  recharge.forEach((data) => {
    totalRecharge += data.money;
  });
  const [withdraw] = await connection.query(
    "SELECT * FROM withdraw WHERE `phone` = ? AND status = 1",
    [rows[0].phone]
  );
  let totalWithdraw = 0;
  withdraw.forEach((data) => {
    totalWithdraw += data.money;
  });

  const { id, password, ip, veri, ip_address, status, time, token, ...others } =
    rows[0];
  return res.status(200).json({
    message: "Success",
    status: true,
    data: {
      code: others.code,
      id_user: others.id_user,
      name_user: others.name_user,
      phone_user: others.phone,
      money_user: others.money,
    },
    totalRecharge: totalRecharge,
    totalWithdraw: totalWithdraw,
    timeStamp: timeNow,
  });
};

const changeUser = async (req, res) => {
  let auth = req.cookies.auth;
  let name = req.body.name;
  let type = req.body.type;

  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!rows || !type || !name)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  switch (type) {
    case "editname":
      await connection.query(
        "UPDATE users SET name_user = ? WHERE `token` = ? ",
        [name, auth]
      );
      return res.status(200).json({
        message: "Sửa đổi tên đăng nhập thành công",
        status: true,
        timeStamp: timeNow,
      });

    default:
      return res.status(200).json({
        message: "Failed",
        status: false,
        timeStamp: timeNow,
      });
  }
};

const changePassword = async (req, res) => {
  let auth = req.cookies.auth;
  let password = req.body.password;
  let newPassWord = req.body.newPassWord;
  // let otp = req.body.otp;

  if (!password || !newPassWord)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? AND `password` = ? ",
    [auth, md5(password)]
  );
  if (rows.length == 0)
    return res.status(200).json({
      message: "Mật khẩu không chính xác",
      status: false,
      timeStamp: timeNow,
    });

  // let getTimeEnd = Number(rows[0].time_otp);
  // let tet = new Date(getTimeEnd).getTime();
  // var now = new Date().getTime();
  // var timeRest = tet - now;
  // if (timeRest <= 0) {
  //     return res.status(200).json({
  //         message: 'Mã OTP đã hết hiệu lực',
  //         status: false,
  //         timeStamp: timeNow,
  //     });
  // }

  // const [check_otp] = await connection.query('SELECT * FROM users WHERE `token` = ? AND `password` = ? AND otp = ? ', [auth, md5(password), otp]);
  // if(check_otp.length == 0) return res.status(200).json({
  //     message: 'Mã OTP không chính xác',
  //     status: false,
  //     timeStamp: timeNow,
  // });;

  await connection.query(
    "UPDATE users SET otp = ?, password = ? WHERE `token` = ? ",
    [randomNumber(100000, 999999), md5(newPassWord), auth]
  );
  return res.status(200).json({
    message: "Sửa đổi mật khẩu thành công",
    status: true,
    timeStamp: timeNow,
  });
};

const checkInHandling = async (req, res) => {
  let auth = req.cookies.auth;
  let data = req.body.data;

  if (!auth)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!rows)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  if (!data) {
    const [point_list] = await connection.query(
      "SELECT * FROM point_list WHERE `phone` = ? ",
      [rows[0].phone]
    );
    return res.status(200).json({
      message: "Nhận thành công",
      datas: point_list,
      status: true,
      timeStamp: timeNow,
    });
  }
  if (data) {
    if (data == 1) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 100000;
      if (point_list.total1) {
        if (check >= data && point_list.total1 != 0) {
          await connection.query(
            "UPDATE users SET money = money + ? WHERE phone = ? ",
            [point_list.total1, rows[0].phone]
          );
          await connection.query(
            "UPDATE point_list SET total1 = ? WHERE phone = ? ",
            [0, rows[0].phone]
          );
          return res.status(200).json({
            message: `Bạn vừa nhận được ${point_list.total1}.00₫`,
            status: true,
            timeStamp: timeNow,
          });
        } else if (check < get && point_list.total1 != 0) {
          return res.status(200).json({
            message: "Bạn chưa đủ điều kiện để nhận quà",
            status: false,
            timeStamp: timeNow,
          });
        } else if (point_list.total1 == 0) {
          return res.status(200).json({
            message: "Bạn đã nhận phần quà này rồi",
            status: false,
            timeStamp: timeNow,
          });
        }
      }
    }
    if (data == 2) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 200000;
      if (check >= get && point_list.total2 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total2, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total2 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total2}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total2 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total2 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 3) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 500000;
      if (check >= get && point_list.total3 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total3, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total3 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total3}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total3 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total3 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 4) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 2000000;
      if (check >= get && point_list.total4 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total4, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total4 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total4}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total4 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total4 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 5) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 5000000;
      if (point_list.total5) {
        if (check >= get && point_list.total5 != 0) {
          await connection.query(
            "UPDATE users SET money = money + ? WHERE phone = ? ",
            [point_list.total5, rows[0].phone]
          );
          await connection.query(
            "UPDATE point_list SET total5 = ? WHERE phone = ? ",
            [0, rows[0].phone]
          );
          return res.status(200).json({
            message: `Bạn vừa nhận được ${point_list.total5}.00₫`,
            status: true,
            timeStamp: timeNow,
          });
        } else if (check < get && point_list.total5 != 0) {
          return res.status(200).json({
            message: "Bạn chưa đủ điều kiện để nhận quà",
            status: false,
            timeStamp: timeNow,
          });
        } else if (point_list.total5 == 0) {
          return res.status(200).json({
            message: "Bạn đã nhận phần quà này rồi",
            status: false,
            timeStamp: timeNow,
          });
        }
      }
    }
    if (data == 6) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 10000000;
      if (check >= get && point_list.total6 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total6, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total6 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total6}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total6 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total6 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 7) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 20000000;
      if (check >= get && point_list.total7 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total7, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total7 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total7}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total7 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total7 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
  }
};

function formateT(params) {
  let result = params < 10 ? "0" + params : params;
  return result;
}

function timerJoin(params = "") {
  let date = "";
  if (params) {
    date = new Date(Number(params));
  } else {
    date = Date.now();
    date = new Date(Number(date));
  }
  let years = formateT(date.getFullYear());
  let months = formateT(date.getMonth() + 1);
  let days = formateT(date.getDate());
  let weeks = formateT(date.getDay());

  let hours = formateT(date.getHours());
  let minutes = formateT(date.getMinutes());
  let seconds = formateT(date.getSeconds());
  // return years + '-' + months + '-' + days + ' ' + hours + '-' + minutes + '-' + seconds;
  return years + " - " + months + " - " + days;
}

const promotion = async (req, res) => {
  debugger;
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT * FROM users WHERE token = ? ",
    [auth]
  );

  const [rechargeLowerGrade] = await connection.query(
    "SELECT * FROM `recharge` ORDER BY `recharge`.`today` ASC"
  );

  let totalOfMoney = 0;

  for (let i = 0; i < rechargeLowerGrade.length; i++) {
    totalOfMoney += rechargeLowerGrade[i].money;
  }

  const currentDate = new Date().toISOString().split("T")[0];

  const todayRecharges = rechargeLowerGrade.filter(
    (item) => item.today === currentDate
  );

  const currentTime = Date.now();

  const twentyFourHoursAgo = currentTime - 24 * 60 * 60 * 1000;

  const recentItems = rechargeLowerGrade.filter((item) => {
    return parseInt(item.time) >= twentyFourHoursAgo;
  });

  const totalMoney = recentItems.reduce((accumulator, currentValue) => {
    return accumulator + currentValue.money;
  }, 0);

  const napdauValue = user[0].napdau;
  const tongcuocValue = user[0].tongcuoc;
  const moneyValue = user[0].money;

  const [level] = await connection.query("SELECT * FROM level");
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];

  const [f1s] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
    [userInfo.code]
  );

  let f1_today = 0;
  for (let i = 0; i < f1s?.length; i++) {
    const f1_time = f1s[i]?.time; // Mã giới thiệu f1
    let check = timerJoin(f1_time) == timerJoin() ? true : false;
    if (check) {
      f1_today += 1;
    }
  }

  // tất cả cấp dưới hôm nay
  // let f_all_today = 0;
  // for (let i = 0; i < f1s.length; i++) {
  //   const f1_code = f1s[i].code; // Mã giới thiệu f1
  //   const f1_time = f1s[i].time; // time f1
  //   let check_f1 = timerJoin(f1_time) == timerJoin() ? true : false;
  //   if (check_f1) f_all_today += 1;
  //   // tổng f1 mời đc hôm nay
  //   const [f2s] = await connection.query(
  //     "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
  //     [f1_code]
  //   );
  //   for (let i = 0; i < f2s.length; i++) {
  //     const f2_code = f2s[i].code; // Mã giới thiệu f2
  //     const f2_time = f2s[i].time; // time f2
  //     let check_f2 = timerJoin(f2_time) == timerJoin() ? true : false;
  //     if (check_f2) f_all_today += 1;
  //     // tổng f2 mời đc hôm nay
  //     const [f3s] = await connection.query(
  //       "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
  //       [f2_code]
  //     );
  //     for (let i = 0; i < f3s.length; i++) {
  //       const f3_code = f3s[i].code; // Mã giới thiệu f3
  //       const f3_time = f3s[i].time; // time f3
  //       let check_f3 = timerJoin(f3_time) == timerJoin() ? true : false;
  //       if (check_f3) f_all_today += 1;
  //       const [f4s] = await connection.query(
  //         "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
  //         [f3_code]
  //       );
  //       // // tổng f3 mời đc hôm nay
  //       // for (let i = 0; i < f4s.length; i++) {
  //       //   const f4_code = f4s[i].code; // Mã giới thiệu f4
  //       //   const f4_time = f4s[i].time; // time f4
  //       //   let check_f4 = timerJoin(f4_time) == timerJoin() ? true : false;
  //       //   if (check_f4) f_all_today += 1;
  //       //   const [f4s] = await connection.query(
  //       //     "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
  //       //     [f4_code]
  //       //   );
  //       // }
  //     }
  //   }
  // }

  let f_all_today = 0;
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code; // Mã giới thiệu f1
    const f1_time = f1s[i].time; // time f1
    let check_f1 = timerJoin(f1_time) == timerJoin() ? true : false;
    if (check_f1) f_all_today += 1;
    // tổng f1 mời đc hôm nay
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    for (let j = 0; j < f2s.length; j++) {
      const f2_code = f2s[j].code; // Mã giới thiệu f2
      const f2_time = f2s[j].time; // time f2
      let check_f2 = timerJoin(f2_time) == timerJoin() ? true : false;
      if (check_f2) f_all_today += 1;
      // tổng f2 mời đc hôm nay
      const [f3s] = await connection.query(
        "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
        [f2_code]
      );
      for (let k = 0; k < f3s.length; k++) {
        const f3_code = f3s[k].code; // Mã giới thiệu f3
        const f3_time = f3s[k].time; // time f3
        let check_f3 = timerJoin(f3_time) == timerJoin() ? true : false;
        if (check_f3) f_all_today += 1;
        const [f4s] = await connection.query(
          "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
          [f3_code]
        );
        for (let l = 0; l < f4s.length; l++) {
          const f4_code = f4s[l].code; // Mã giới thiệu f4
          const f4_time = f4s[l].time; // time f4
          let check_f4 = timerJoin(f4_time) == timerJoin() ? true : false;
          if (check_f4) f_all_today += 1;
          const [f5s] = await connection.query(
            "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
            [f4_code]
          );
          for (let m = 0; m < f5s.length; m++) {
            const f5_code = f5s[m].code; // Mã giới thiệu f5
            const f5_time = f5s[m].time; // time f5
            let check_f5 = timerJoin(f5_time) == timerJoin() ? true : false;
            if (check_f5) f_all_today += 1;
            // Handle f5 if needed
          }
        }
      }
    }
  }

  // Tổng số f2
  let f2 = 0;
  let array12 = [];
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code; // Mã giới thiệu f1

    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    // console.log("🚀 ~ promotion ~ f2s:", f2s);
    const [f2s1] = await connection.query(
      "SELECT * FROM users WHERE `code` = ? ",
      [f1s[i].code]
    );
    // console.log(f2s1);
    array12.push(f2s1);

    // f2 += f2s.length;
    // array12.push(f2s);
    // console.log(array12);
    // f2 = f2s;
  }

  // Tổng số f3
  let f3 = 0;
  let array13 = [];
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code; // Mã giới thiệu f1
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    // console.log("🚀 ~ promotion ~ f2s:", f2s);
    for (let i = 0; i < f2s.length; i++) {
      const f2_code = f2s[i].code;
      const [f3s] = await connection.query(
        "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
        [f2_code]
      );
      const [f2s1] = await connection.query(
        "SELECT * FROM users WHERE `code` = ? ",
        [f2s[i].code]
      );
      // console.log(f2s1);
      array13.push(f2s1);
      if (f3s.length > 0) f3 += f3s.length;
    }
  }

  // Tổng số f4
  let f4 = 0;
  let array14 = [];
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code; // Mã giới thiệu f1
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    for (let i = 0; i < f2s.length; i++) {
      const f2_code = f2s[i].code;
      const [f3s] = await connection.query(
        "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
        [f2_code]
      );
      for (let i = 0; i < f3s.length; i++) {
        const f3_code = f3s[i].code;
        const [f4s] = await connection.query(
          "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
          [f3_code]
        );
        array13.push(f4s);
        if (f4s.length > 0) f4 += f4s.length;
      }
    }
  }

  // SELECT F0 -> F4

  const [sf0] = await connection.query(
    "SELECT * FROM users WHERE `invite` = ? ",
    [userInfo.code]
  );
  // console.log("🚀 ~ promotion ~ sf0:", sf0);

  let sf1 = 0;
  let array_sf1 = [];

  for (let i = 0; i < sf0.length; i++) {
    const inviteCode = sf0[i].code;
    const [result] = await connection.query(
      "SELECT * FROM users WHERE `invite` = ? AND `code` != ?",
      [inviteCode, userInfo.code]
    );
    array_sf1.push(result);
    sf1 += result.length;
  }

  // console.log("🚀 ~ promotion ~ array_sf1:", array_sf1);

  let sf2 = 0;
  let array_sf2 = [];

  const f1Codes = [];
  for (let i = 0; i < array_sf1.length; i++) {
    const f1Data = array_sf1[i];
    for (let j = 0; j < f1Data.length; j++) {
      const f1 = f1Data[j];
      if (f1.code !== userInfo.code) {
        f1Codes.push(f1.code);
      }
    }
  }

  for (let i = 0; i < f1Codes.length; i++) {
    const f1_code = f1Codes[i];
    const [result_f2] = await connection.query(
      "SELECT * FROM users WHERE `invite` = ? AND `code` != ?",
      [f1_code, userInfo.code]
    );
    array_sf2.push(result_f2);
    sf2 += result_f2.length;
  }

  // console.log("🚀 ~ promotion ~ array_sf2:", array_sf2);

  let sf3 = 0;
  let array_sf3 = [];

  const f2Codes = [];
  for (let i = 0; i < array_sf2.length; i++) {
    const f2Data = array_sf2[i];
    for (let j = 0; j < f2Data.length; j++) {
      const f2 = f2Data[j];
      if (!f1Codes.includes(f2.code)) {
        f2Codes.push(f2.code);
      }
    }
  }

  for (let i = 0; i < f2Codes.length; i++) {
    const f2_code = f2Codes[i];
    const [result_f3] = await connection.query(
      "SELECT * FROM users WHERE `invite` = ? AND `code` != ?",
      [f2_code, userInfo.code]
    );
    array_sf3.push(result_f3);
    sf3 += result_f3.length;
  }

  // console.log("🚀 ~ promotion ~ array_sf3:", array_sf3);

  let sf4 = 0;
  let array_sf4 = [];
  const f3Codes = [];
  for (let i = 0; i < array_sf2.length; i++) {
    const f2Data = array_sf2[i];
    for (let j = 0; j < f2Data.length; j++) {
      const f2 = f2Data[j];
      if (!f1Codes.includes(f2.code)) {
        f3Codes.push(f2.code);
      }
    }
  }

  for (let i = 0; i < f3Codes.length; i++) {
    const f2_code = f3Codes[i];
    const [result_f4] = await connection.query(
      "SELECT * FROM users WHERE `invite` = ? AND `code` != ?",
      [f2_code, userInfo.code]
    );
    array_sf4.push(result_f4);
    sf4 += result_f4.length;
  }

  let allData = [];

  allData = allData.concat(sf0);

  for (let i = 0; i < array_sf1.length; i++) {
    allData = allData.concat(array_sf1[i]);
  }

  for (let i = 0; i < array_sf2.length; i++) {
    allData = allData.concat(array_sf2[i]);
  }

  for (let i = 0; i < array_sf3.length; i++) {
    allData = allData.concat(array_sf3[i]);
  }

  for (let i = 0; i < array_sf4.length; i++) {
    allData = allData.concat(array_sf4[i]);
  }

  const uniqueData = [...new Set(allData.map(JSON.stringify))].map(JSON.parse);

  const matchingInviteAndDifferentCode = sf0.filter(
    (data) => data.invite === userInfo.code && data.code !== userInfo.code
  );

  const dataWithNonZeroTotalMoney = matchingInviteAndDifferentCode.filter(
    (data) => data.total_money !== 0
  );

  const totalMoneySum = matchingInviteAndDifferentCode.reduce(
    (accumulator, currentValue) => accumulator + currentValue.total_money,
    0
  );

  const phonesToMatch = matchingInviteAndDifferentCode.map(
    (data) => data.phone
  );

  const matchingPhones = rechargeLowerGrade.filter((data) =>
    phonesToMatch.includes(data.phone)
  );

  const uniquePhones = [];
  const uniqueMatchingPhones = matchingPhones.filter((data) => {
    if (!uniquePhones.includes(data.phone)) {
      uniquePhones.push(data.phone);
      return true;
    }
    return false;
  });

  const currentDateDirectSubordinates = new Date().toISOString().slice(0, 10);
  const dataWithCurrentDate = uniqueMatchingPhones.filter(
    (data) => data.today === currentDateDirectSubordinates
  );

  const dataDirectSubordinatesData = {
    registered_users_direct_subordinates: matchingInviteAndDifferentCode.length,
    depositing_users_direct_subordinates: dataWithNonZeroTotalMoney.length,
    deposited_amount_direct_subordinates: totalMoneySum,
    first_deposit_users_direct_subordinates: dataWithCurrentDate.length,
  };

  //
  const [userAll] = await connection.query("SELECT * FROM `users`");
  const codeUser = userInfo.code;
  const invitedUsersF1 = userAll.filter(
    (user) => user.invite === codeUser && user.code !== userInfo.code
  ); //F1 Array
  const invitedUserCodesF2 = invitedUsersF1.map((user) => user.code);
  const usersWithSameInviteF2 = userAll.filter((user) =>
    invitedUserCodesF2.includes(user.invite)
  ); //F2 Array
  const userCodesWithSameInviteF3 = usersWithSameInviteF2.map(
    (user) => user.code
  );
  const usersWithSameInviteAsCodeF3 = userAll.filter((user) =>
    userCodesWithSameInviteF3.includes(user.invite)
  ); //F3 Array
  const invitedUserCodesF4 = usersWithSameInviteAsCodeF3.map(
    (user) => user.code
  );
  const usersWithSameInviteAsCodeF4 = userAll.filter((user) =>
    invitedUserCodesF4.includes(user.invite)
  ); //F4 Array
  const invitedUserCodesF5 = usersWithSameInviteAsCodeF4.map(
    (user) => user.code
  );
  const usersWithSameInviteAsCodeF5 = userAll.filter((user) =>
    invitedUserCodesF5.includes(user.invite)
  ); //F5 Array

  const allDataMySubordinates = [
    ...invitedUsersF1,
    ...usersWithSameInviteF2,
    ...usersWithSameInviteAsCodeF3,
    ...usersWithSameInviteAsCodeF4,
    ...usersWithSameInviteAsCodeF5,
  ];

  const dataWithNonZeroTotalMoneyMySubordinates = allDataMySubordinates.filter(
    (data) => data.total_money !== 0
  );

  const totalMoneySumMySubordinates = allDataMySubordinates.reduce(
    (accumulator, currentValue) => accumulator + currentValue.total_money,
    0
  );

  const phonesToMatMySubordinates = allDataMySubordinates.map(
    (data) => data.phone
  );

  const matchingPhonesMySubordinates = rechargeLowerGrade.filter((data) =>
    phonesToMatMySubordinates.includes(data.phone)
  );

  const uniquePhonesMySubordinates = [];
  const uniqueMatchingPhonesMySubordinates =
    matchingPhonesMySubordinates.filter((data) => {
      if (!uniquePhonesMySubordinates.includes(data.phone)) {
        uniquePhonesMySubordinates.push(data.phone);
        return true;
      }
      return false;
    });

  const currentDateDirectSubordinatesMySubordinates = new Date()
    .toISOString()
    .slice(0, 10);
  const dataWithCurrentDateMySubordinates =
    uniqueMatchingPhonesMySubordinates.filter(
      (data) => data.today === currentDateDirectSubordinatesMySubordinates
    );

  const dataMySubordinates = {
    registered_users_my_subordinates: allDataMySubordinates.length,
    depositing_users_my_subordinates:
      dataWithNonZeroTotalMoneyMySubordinates.length,
    deposited_amount_my_subordinates: totalMoneySumMySubordinates,
    first_deposit_users_my_subordinates:
      dataWithCurrentDateMySubordinates.length,
  };

  //F1
  const newArrayF1 = sf0.filter((item) => item.code !== item.invite);
  //F2
  const newArrayF2 = userAll.filter((user) => {
    return newArrayF1.some((newItem) => newItem.code === user.invite);
  });
  //F3
  const newArrayF3 = userAll.filter((user) => {
    return newArrayF2.some((newItem) => newItem.code === user.invite);
  });
  //F4
  const newArrayF4 = userAll.filter((user) => {
    return newArrayF3.some((newItem) => newItem.code === user.invite);
  });

  function getSummaryData(dataArray) {
    const currentDateDay = new Date().toISOString().slice(0, 10);

    const numDepositUsers = rechargeLowerGrade.filter((user) => {
      return dataArray.some((newItem) => newItem.phone == user.phone);
    });

    // const numDepositUsers = dataArray.filter((user) => user.money !== 0).length;

    const totalDepositAmount = numDepositUsers.reduce(
      (total, user) => total + user.money,
      0
    );

    const numBetUsers = dataArray.filter((user) => user.tongcuoc !== 0).length;
    const totalBetAmount = dataArray.reduce(
      (total, user) => total + user.tongcuoc,
      0
    );

    // Handling invalid time values
    const numFirstDepositUsers = numDepositUsers.filter((user) => {
      try {
        return (
          user.money !== 0 &&
          new Date(parseInt(user.time)).toISOString().slice(0, 10) ===
            currentDateDay
        );
      } catch (error) {
        return false;
      }
    }).length;

    const totalFirstDepositAmount = numDepositUsers
      .filter((user) => {
        try {
          return (
            user.money !== 0 &&
            new Date(parseInt(user.time)).toISOString().slice(0, 10) ===
              currentDateDay
          );
        } catch (error) {
          return false;
        }
      })
      .reduce((total, user) => total + user.money, 0);

    return {
      num_deposit_users: numDepositUsers.length,
      total_deposit_amount: totalDepositAmount,
      num_bet_users: numBetUsers,
      total_bet_amount: totalBetAmount,
      num_first_deposit_users: numFirstDepositUsers,
      total_first_deposit_amount: totalFirstDepositAmount,
    };
  }

  const summary_table = {
    summary_f_all: [getSummaryData(uniqueData)],
    summary_f_1: [getSummaryData(newArrayF1)],
    summary_f_2: [getSummaryData(newArrayF2)],
    summary_f_3: [getSummaryData(newArrayF3)],
    summary_f_4: [getSummaryData(newArrayF4)],
  };

  // console.log("Kết quả tìm kiếm:", totalDepositAmount123);

  return res.status(200).json({
    message: "Nhận thành công",
    level: level,
    info: user,
    status: true,
    invite: {
      select_f_all: uniqueData,
      select_f1: newArrayF1,
      select_f2: newArrayF2,
      select_f3: newArrayF3,
      select_f4: newArrayF4,
      data_direct_subordinates: dataDirectSubordinatesData,
      data_my_subordinates: dataMySubordinates,
      summary: summary_table,
      f1: f1s.length,
      total_f: f1s.length + f2 + f3 + f4,
      // f2: array12,
      // f3: array13,
      // f4: array14,
      f1_today: f1_today,
      f_all_today: f_all_today,
      roses_f1: userInfo.roses_f1,
      roses_f: userInfo.roses_f,
      roses_all: userInfo.roses_f,
      roses_today: userInfo.roses_today,
      napdau: napdauValue,
      tongcuoc: tongcuocValue,
      money: moneyValue,
      number_of_people_deposit: rechargeLowerGrade.length,
      number_of_people_deposit_today: todayRecharges.length,
      total_of_money: totalOfMoney + moneyValue,
    },
    timeStamp: timeNow,
  });
};

const myTeam = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  const [level] = await connection.query("SELECT * FROM level");
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  return res.status(200).json({
    message: "Nhận thành công",
    level: level,
    info: user,
    status: true,
    timeStamp: timeNow,
  });
};

const listMyTeam = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];

  const [f1] = await connection.query(
    "SELECT `id_user`, `name_user`,`status`, `time` FROM users WHERE `invite` = ? ORDER BY id DESC",
    [userInfo.code]
  );

  const [mem] = await connection.query(
    "SELECT `id_user`, `phone`, `time` FROM users WHERE `invite` = ? ORDER BY id DESC LIMIT 100",
    [userInfo.code]
  );
  const [total_roses] = await connection.query(
    "SELECT `f1`, `time`, `chitiet` FROM roses WHERE `invite` = ? ORDER BY id DESC LIMIT 100",
    [userInfo.code]
  );

  let newMem = [];
  mem.map((data) => {
    let objectMem = {
      id_user: data.id_user,
      phone:
        "84" + data.phone.slice(0, 1) + "****" + String(data.phone.slice(-4)),
      time: data.time,
    };

    return newMem.push(objectMem);
  });
  return res.status(200).json({
    message: "Nhận thành công",
    f1: f1,
    mem: newMem,
    total_roses: total_roses,
    status: true,
    timeStamp: timeNow,
  });
};

const recharge = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  let type = req.body.type;
  let typeid = req.body.typeid;

  if (type != "cancel") {
    if (!auth || !money || money < 50000) {
      return res.status(200).json({
        message: "Failed",
        status: false,
        timeStamp: timeNow,
      });
    }
  }
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
  if (type == "cancel") {
    await connection.query(
      "UPDATE recharge SET status = 2 WHERE phone = ? AND id_order = ? AND status = ? ",
      [userInfo.phone, typeid, 0]
    );
    return res.status(200).json({
      message: "Hủy đơn thành công",
      status: true,
      timeStamp: timeNow,
    });
  }
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
    [userInfo.phone, 0]
  );
  if (recharge.length == 0) {
    let time = new Date().getTime();
    const date = new Date();
    function formateT(params) {
      let result = params < 10 ? "0" + params : params;
      return result;
    }

    function timerJoin(params = "") {
      let date = "";
      if (params) {
        date = new Date(Number(params));
      } else {
        date = new Date();
      }
      let years = formateT(date.getFullYear());
      let months = formateT(date.getMonth() + 1);
      let days = formateT(date.getDate());
      return years + "-" + months + "-" + days;
    }
    let checkTime = timerJoin(time);
    let id_time =
      date.getUTCFullYear() +
      "" +
      date.getUTCMonth() +
      1 +
      "" +
      date.getUTCDate();
    let id_order =
      Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) +
      10000000000000;
    // let vat = Math.floor(Math.random() * (2000 - 0 + 1) ) + 0;

    money = Number(money);
    let client_transaction_id = id_time + id_order;
    const formData = {
      username: process.env.accountBank,
      secret_key: process.env.secret_key,
      client_transaction: client_transaction_id,
      amount: money,
    };

    if (type == "momo") {
      const sql = `INSERT INTO recharge SET 
            id_order = ?,
            transaction_id = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            today = ?,
            url = ?,
            time = ?`;
      await connection.execute(sql, [
        client_transaction_id,
        "NULL",
        userInfo.phone,
        money,
        type,
        0,
        checkTime,
        "NULL",
        time,
      ]);
      const [recharge] = await connection.query(
        "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
        [userInfo.phone, 0]
      );
      return res.status(200).json({
        message: "Nhận thành công",
        datas: recharge[0],
        status: true,
        timeStamp: timeNow,
      });
    }

    const sql = `INSERT INTO recharge SET 
        id_order = ?,
        transaction_id = ?,
        phone = ?,
        money = ?,
        type = ?,
        status = ?,
        today = ?,
        url = ?,
        time = ?`;
    await connection.execute(sql, [
      client_transaction_id,
      "0",
      userInfo.phone,
      money,
      type,
      0,
      checkTime,
      "0",
      time,
    ]);
    const [recharge] = await connection.query(
      "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
      [userInfo.phone, 0]
    );
    return res.status(200).json({
      message: "Tạo đơn thành công",
      datas: recharge[0],
      status: true,
      timeStamp: timeNow,
    });
  } else {
    return res.status(200).json({
      message: "Nhận thành công",
      datas: recharge[0],
      status: true,
      timeStamp: timeNow,
    });
  }
};

const addBank = async (req, res) => {
  let auth = req.cookies.auth;
  let name_bank = req.body.name_bank;
  let name_user = req.body.name_user;
  let stk = req.body.stk;
  console.log("da vao day");
  // let tp = req.body.tp;
  // let email = req.body.email;
  // let sdt = req.body.sdt;
  // let tinh = req.body.tinh;
  // let chi_nhanh = req.body.chi_nhanh;

  if (!auth || !name_bank || !name_user || !stk) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [user_bank] = await connection.query(
    "SELECT * FROM user_bank WHERE stk = ? ",
    [stk]
  );
  const [user_bank2] = await connection.query(
    "SELECT * FROM user_bank WHERE phone = ? ",
    [userInfo.phone]
  );
  if (user_bank.length == 0 && user_bank2.length == 0) {
    let time = new Date().getTime();
    const sql = `INSERT INTO user_bank SET 
        phone = ?,
        name_bank = ?,
        name_user = ?,
        stk = ?,
        time = ?`;
    await connection.execute(sql, [
      userInfo.phone,
      name_bank,
      name_user,
      stk,
      time,
    ]);
    return res.status(200).json({
      message: "Thêm ngân hàng thành công",
      status: true,
      timeStamp: timeNow,
    });
  } else if (user_bank.length > 0) {
    return res.status(200).json({
      message: "Số tài khoản này đã tồn tại trong hệ thống",
      status: false,
      timeStamp: timeNow,
    });
  } else if (user_bank2.length > 0) {
    return res.status(200).json({
      message: "Tài khoản đã liên kết ngân hàng rồi",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const editBank = async (req, res) => {
  let auth = req.cookies.auth;
  let name_bank = req.body.name_bank;
  let name_user = req.body.name_user;
  let stk = req.body.stk;
  /*     let tp = req.body.tp;
    let email = req.body.email;
    let sdt = req.body.sdt;
    let tinh = req.body.tinh;
    let chi_nhanh = req.body.chi_nhanh; */

  if (!auth || !name_bank || !name_user || !stk) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [check] = await connection.query(
    "SELECT * FROM user_bank WHERE `phone` = ? ",
    [userInfo.phone]
  );
  if (check.length > 0) {
    let time = new Date().getTime();
    const sql = `UPDATE user_bank SET 
        name_bank = ?,
        name_user = ?,
        stk = ?
        WHERE phone = ?`;
    try {
      await connection.execute(sql, [
        name_bank,
        name_user,
        stk,
        userInfo.phone,
      ]);
    } catch (err) {
      console.log(err);
    }
    return res.status(200).json({
      message: "Sửa ngân hàng thành công",
      status: true,
      timeStamp: timeNow,
    });
  } else {
    return res.status(200).json({
      message: "Không tồn tại bank",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const infoUserBank = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `money` FROM users WHERE `token` = ? ",
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
  function formateT(params) {
    let result = params < 10 ? "0" + params : params;
    return result;
  }

  function timerJoin(params = "") {
    let date = "";
    if (params) {
      date = new Date(Number(params));
    } else {
      date = new Date();
    }
    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());
    return years + "-" + months + "-" + days;
  }
  let date = new Date().getTime();
  let checkTime = timerJoin(date);
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND today = ? AND status = 1 ",
    [userInfo.phone, checkTime]
  );
  const [minutes_1] = await connection.query(
    "SELECT * FROM minutes_1 WHERE phone = ? AND today = ? ",
    [userInfo.phone, checkTime]
  );
  let total = 0;
  recharge.forEach((data) => {
    total += data.money;
  });
  let total2 = 0;
  minutes_1.forEach((data) => {
    total2 += data.money;
  });

  let result = 0;
  if (total - total2 > 0) result = total - total2;

  const [userBank] = await connection.query(
    "SELECT * FROM user_bank WHERE phone = ? ",
    [userInfo.phone]
  );
  return res.status(200).json({
    message: "Nhận thành công",
    datas: userBank,
    userInfo: user,
    result: result,
    status: true,
    timeStamp: timeNow,
  });
};

const withdrawal3 = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  let password = req.body.password;
  if (!auth || !money || !password || money < 100000) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `money` FROM users WHERE `token` = ? AND password = ?",
    [auth, md5(password)]
  );

  if (user.length == 0) {
    return res.status(200).json({
      message: "Mật khẩu không chính xác",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];
  const date = new Date();
  let id_time =
    date.getUTCFullYear() +
    "" +
    date.getUTCMonth() +
    1 +
    "" +
    date.getUTCDate();
  let id_order =
    Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) +
    10000000000000;

  function formateT(params) {
    let result = params < 10 ? "0" + params : params;
    return result;
  }

  function timerJoin(params = "") {
    let date = "";
    if (params) {
      date = new Date(Number(params));
    } else {
      date = new Date();
    }
    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());
    return years + "-" + months + "-" + days;
  }
  let dates = new Date().getTime();
  let checkTime = timerJoin(dates);
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND today = ? AND status = 1 ",
    [userInfo.phone, checkTime]
  );
  const [minutes_1] = await connection.query(
    "SELECT * FROM minutes_1 WHERE phone = ? AND today = ? ",
    [userInfo.phone, checkTime]
  );
  // let total = 0;
  recharge.forEach((data) => {
    //      total += data.money;
  });
  let total2 = 0;
  minutes_1.forEach((data) => {
    total2 += data.money;
  });

  let result = 0;
  // if(total - total2 > 0) result = total - total2;

  const [user_bank] = await connection.query(
    "SELECT * FROM user_bank WHERE `phone` = ?",
    [userInfo.phone]
  );
  const [withdraw] = await connection.query(
    "SELECT * FROM withdraw WHERE `phone` = ?",
    [userInfo.phone]
  );
  if (user_bank.length != 0) {
    //if (withdraw.length < 3) {
    if (userInfo.money - money >= 0) {
      if (result == 0) {
        let infoBank = user_bank[0];
        const sql = `INSERT INTO withdraw SET 
                    id_order = ?,
                    phone = ?,
                    money = ?,
                    stk = ?,
                    name_bank = ?,
                    name_user = ?,
                    status = ?,
                    today = ?,
                    time = ?`;
        await connection.execute(sql, [
          id_time + "" + id_order,
          userInfo.phone,
          money,
          infoBank.stk,
          infoBank.name_bank,
          infoBank.name_user,
          0,
          checkTime,
          dates,
        ]);
        await connection.query(
          "UPDATE users SET money = money - ? WHERE phone = ? ",
          [money, userInfo.phone]
        );
        return res.status(200).json({
          message: "Rút tiền thành công",
          status: true,
          money: userInfo.money - money,
          timeStamp: timeNow,
        });
      } else {
        return res.status(200).json({
          message: "Tổng tiền cược chưa đủ để thực hiện yêu cầu",
          status: false,
          timeStamp: timeNow,
        });
      }
    } else {
      return res.status(200).json({
        message: "Số dư không đủ để thực hiện yêu cầu",
        status: false,
        timeStamp: timeNow,
      });
    }
    //} else {
    //    return res.status(200).json({
    //        message: 'Mỗi ngày bạn chỉ được thực hiện 3 lần rút tiền',
    //        status: false,
    //        timeStamp: timeNow,
    //    });
    //}
  } else {
    return res.status(200).json({
      message: "Vui lòng liên kết ngân hàng trước",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const recharge2 = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
    [userInfo.phone, 0]
  );
  const [bank_recharge] = await connection.query(
    "SELECT * FROM bank_recharge "
  );
  if (recharge.length != 0) {
    return res.status(200).json({
      message: "Nhận thành công",
      datas: recharge[0],
      infoBank: bank_recharge,
      status: true,
      timeStamp: timeNow,
    });
  } else {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const listRecharge = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? ORDER BY id DESC ",
    [userInfo.phone]
  );
  return res.status(200).json({
    message: "Nhận thành công",
    datas: recharge,
    status: true,
    timeStamp: timeNow,
  });
};

const search = async (req, res) => {
  let auth = req.cookies.auth;
  let phone = req.body.phone;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `level` FROM users WHERE `token` = ? ",
    [auth]
  );
  if (user.length == 0) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];
  if (userInfo.level == 1) {
    const [users] = await connection.query(
      `SELECT * FROM users WHERE phone = ? ORDER BY id DESC `,
      [phone]
    );
    return res.status(200).json({
      message: "Nhận thành công",
      datas: users,
      status: true,
      timeStamp: timeNow,
    });
  } else if (userInfo.level == 2) {
    const [users] = await connection.query(
      `SELECT * FROM users WHERE phone = ? ORDER BY id DESC `,
      [phone]
    );
    if (users.length == 0) {
      return res.status(200).json({
        message: "Nhận thành công",
        datas: [],
        status: true,
        timeStamp: timeNow,
      });
    } else {
      if (users[0].ctv == userInfo.phone) {
        return res.status(200).json({
          message: "Nhận thành công",
          datas: users,
          status: true,
          timeStamp: timeNow,
        });
      } else {
        return res.status(200).json({
          message: "Failed",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
  } else {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const listWithdraw = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [recharge] = await connection.query(
    "SELECT * FROM withdraw WHERE phone = ? ORDER BY id DESC ",
    [userInfo.phone]
  );
  return res.status(200).json({
    message: "Nhận thành công",
    datas: recharge,
    status: true,
    timeStamp: timeNow,
  });
};

const useRedenvelope = async (req, res) => {
  let auth = req.cookies.auth;
  let code = req.body.code;
  if (!auth || !code) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [redenvelopes] = await connection.query(
    "SELECT * FROM redenvelopes WHERE id_redenvelope = ?",
    [code]
  );

  if (redenvelopes.length == 0) {
    return res.status(200).json({
      message: "Lỗi mã đổi thưởng",
      status: false,
      timeStamp: timeNow,
    });
  } else {
    let infoRe = redenvelopes[0];
    const d = new Date();
    const time = d.getTime();
    if (infoRe.status == 0) {
      await connection.query(
        "UPDATE redenvelopes SET used = ?, status = ? WHERE `id_redenvelope` = ? ",
        [0, 1, infoRe.id_redenvelope]
      );
      await connection.query(
        "UPDATE users SET money = money + ? WHERE `phone` = ? ",
        [infoRe.money, userInfo.phone]
      );
      let sql =
        "INSERT INTO redenvelopes_used SET phone = ?, phone_used = ?, id_redenvelops = ?, money = ?, `time` = ? ";
      await connection.query(sql, [
        infoRe.phone,
        userInfo.phone,
        infoRe.id_redenvelope,
        infoRe.money,
        time,
      ]);
      return res.status(200).json({
        message: `Nhận thành công +${infoRe.money}`,
        status: true,
        timeStamp: timeNow,
      });
    } else {
      return res.status(200).json({
        message: "Mã quà đã được sử dụng",
        status: false,
        timeStamp: timeNow,
      });
    }
  }
};

const callback_bank = async (req, res) => {
  let transaction_id = req.body.transaction_id;
  let client_transaction_id = req.body.client_transaction_id;
  let amount = req.body.amount;
  let requested_datetime = req.body.requested_datetime;
  let expired_datetime = req.body.expired_datetime;
  let payment_datetime = req.body.payment_datetime;
  let status = req.body.status;
  if (!transaction_id) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  if (status == 2) {
    await connection.query(
      `UPDATE recharge SET status = 1 WHERE id_order = ?`,
      [client_transaction_id]
    );
    const [info] = await connection.query(
      `SELECT * FROM recharge WHERE id_order = ?`,
      [client_transaction_id]
    );
    await connection.query(
      "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ",
      [info[0].money, info[0].money, info[0].phone]
    );
    return res.status(200).json({
      message: 0,
      status: true,
    });
  } else {
    await connection.query(`UPDATE recharge SET status = 2 WHERE id = ?`, [id]);

    return res.status(200).json({
      message: "Hủy đơn thành công",
      status: true,
      datas: recharge,
    });
  }
};

module.exports = {
  userInfo,
  changeUser,
  promotion,
  myTeam,
  recharge,
  recharge2,
  listRecharge,
  listWithdraw,
  changePassword,
  checkInHandling,
  infoUserBank,
  addBank,
  editBank,
  withdrawal3,
  callback_bank,
  listMyTeam,
  verifyCode,
  useRedenvelope,
  search,
};
