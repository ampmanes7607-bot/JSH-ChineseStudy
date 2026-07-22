/**
 * 중국어 단어장 - 구글 시트 백업용 Apps Script
 *
 * 설치 방법:
 * 1. 새 구글 시트를 만든다 (sheets.new)
 * 2. 상단 메뉴 확장 프로그램 > Apps Script 클릭
 * 3. 기본 코드를 지우고 이 파일 내용 전체를 붙여넣기
 * 4. 저장 (Ctrl+S) 후 배포 > 새 배포
 * 5. 유형 선택(톱니바퀴) > 웹 앱
 * 6. "실행 계정": 나(본인 계정) / "액세스 권한이 있는 사용자": 전체
 * 7. 배포 클릭 -> 권한 승인(본인 계정으로) -> 웹 앱 URL 복사
 * 8. 그 URL을 단어장 앱 설정 > "구글 시트 동기화"에 붙여넣고 저장
 */

function doGet(e) {
  var sheet = getSheet_();
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var headers = data[0];
  var rows = data.slice(1);
  var seenIds = {};
  var words = rows
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) {
        var v = row[i];
        // 구글 시트가 날짜 형식 텍스트를 자동으로 Date 타입으로 바꿔버린 경우 복구
        if (v instanceof Date) {
          v = Utilities.formatDate(v, tz, "yyyy-MM-dd");
        } else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
          // 예전에 깨진 채로 저장된 ISO 시간 문자열도 시간대 맞춰 복구
          v = Utilities.formatDate(new Date(v), tz, "yyyy-MM-dd");
        }
        obj[h] = v;
      });
      obj.id = obj.id === "" || obj.id == null ? "" : String(obj.id);
      return obj;
    })
    .filter(function (w) { return w.hanzi; }) // 한자가 채워진 행만 유효한 단어로 취급
    .map(function (w, idx) {
      // 시트에서 직접 행을 복사해 추가했을 때 id가 비었거나 중복되면 새 id를 부여
      if (!w.id || seenIds[w.id]) {
        w.id = "sheet" + Date.now() + "_" + idx;
      }
      seenIds[w.id] = true;
      return w;
    });
  return ContentService.createTextOutput(JSON.stringify(words))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var words = body.words || [];
  var sheet = getSheet_();
  sheet.clear();
  var headers = ["id", "hanzi", "pinyin", "meaning", "category", "level", "learnedDate", "scheduledDate"];
  sheet.appendRow(headers);
  if (words.length) {
    var rows = words.map(function (w) {
      return headers.map(function (h) {
        var v = w[h];
        return v === undefined || v === null ? "" : v;
      });
    });
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setNumberFormat("@"); // 날짜/숫자로 자동 변환되지 않도록 텍스트로 고정
    range.setValues(rows);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, count: words.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName("Words") || ss.insertSheet("Words");
}
