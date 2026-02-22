// ═══════════════════════════════════════════════════════
//  google-apps-script.js
//  انسخ هذا الكود في: Google Sheet > Extensions > Apps Script
//  ⚠️ بعد النشر لا تحتاج لتعديله أبداً — يعمل تلقائياً 24/7
// ═══════════════════════════════════════════════════════

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    // ── ورقة النتائج ──────────────────────────────────
    let s1 = ss.getSheetByName("النتائج");
    if (!s1) {
      s1 = ss.insertSheet("النتائج");
      const hdr = ["التاريخ","الامتحان","الاسم الشخصي","النسب","رقم مسار","الهاتف","البريد","النقطة","المجموع","النسبة%","الوقت(د)","صحيحة","خاطئة"];
      s1.appendRow(hdr);
      s1.getRange(1,1,1,hdr.length)
        .setBackground("#0D2B3E").setFontColor("#FFFFFF")
        .setFontWeight("bold").setHorizontalAlignment("center");
      s1.setFrozenRows(1);
      s1.setColumnWidths(1, hdr.length, 130);
    }

    s1.appendRow([
      new Date(data.timestamp),
      data.exam || "—",
      data.student.firstName,
      data.student.lastName,
      data.student.masarId,
      data.student.phone,
      data.student.email,
      data.score,
      data.total,
      data.pct + "%",
      data.elapsed,
      data.correct,
      data.wrong
    ]);

    // لون الصف حسب النسبة
    const row = s1.getLastRow();
    const pct = data.pct;
    s1.getRange(row, 1, 1, 13)
      .setBackground(pct >= 70 ? "#E7F5EE" : pct >= 50 ? "#FEF6E4" : "#FDE9EC");

    // ── ورقة الأسئلة المفتوحة ─────────────────────────
    if (data.openAnswers && Object.keys(data.openAnswers).length) {
      let s2 = ss.getSheetByName("الأسئلة المفتوحة");
      if (!s2) {
        s2 = ss.insertSheet("الأسئلة المفتوحة");
        s2.appendRow(["التاريخ","الامتحان","الاسم الكامل","رقم مسار","رقم السؤال","الإجابة"]);
        s2.getRange(1,1,1,6)
          .setBackground("#163D55").setFontColor("#FFFFFF")
          .setFontWeight("bold");
        s2.setFrozenRows(1);
        s2.setColumnWidth(5, 300);
        s2.setColumnWidth(6, 400);
      }
      Object.entries(data.openAnswers).forEach(([qid, ans]) => {
        if (!ans) return;
        s2.appendRow([
          new Date(data.timestamp),
          data.exam || "—",
          `${data.student.firstName} ${data.student.lastName}`,
          data.student.masarId,
          "س" + qid,
          ans
        ]);
        s2.getRange(s2.getLastRow(), 6)
          .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
          .setVerticalAlignment("top");
      });
    }

    // ── ورقة الطلاب ───────────────────────────────────
    let s3 = ss.getSheetByName("الطلاب");
    if (!s3) {
      s3 = ss.insertSheet("الطلاب");
      s3.appendRow(["رقم مسار","الاسم الشخصي","النسب","الهاتف","البريد","آخر نشاط","عدد الامتحانات"]);
      s3.getRange(1,1,1,7)
        .setBackground("#0D2B3E").setFontColor("#FFFFFF")
        .setFontWeight("bold");
      s3.setFrozenRows(1);
      s3.setColumnWidths(1, 7, 150);
    }

    const allStudents = s3.getDataRange().getValues();
    let studentRowIdx = -1;
    for (let i = 1; i < allStudents.length; i++) {
      if (String(allStudents[i][0]) === String(data.student.masarId)) {
        studentRowIdx = i + 1;
        break;
      }
    }
    if (studentRowIdx === -1) {
      s3.appendRow([
        data.student.masarId, data.student.firstName, data.student.lastName,
        data.student.phone, data.student.email, new Date(data.timestamp), 1
      ]);
    } else {
      const count = (allStudents[studentRowIdx - 1][6] || 0) + 1;
      s3.getRange(studentRowIdx, 6).setValue(new Date(data.timestamp));
      s3.getRange(studentRowIdx, 7).setValue(count);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", msg: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// للتحقق أن النشر يعمل — افتح الرابط في المتصفح
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "يعمل بشكل صحيح ✓" }))
    .setMimeType(ContentService.MimeType.JSON);
}
