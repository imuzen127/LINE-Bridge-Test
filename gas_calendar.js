// =========================================================================
// LINE予約アプリ連携用 Google Apps Script (GAS) コード
// =========================================================================
// 
// 【設定手順】
// 1. https://script.google.com/ にアクセスし、「新しいプロジェクト」を作成します。
// 2. もともと書かれているコードをすべて消去し、このファイルのコードを貼り付けて保存します。
// 3. 右上の「デプロイ」>「新しいデプロイ」をクリックします。
// 4. 左側の歯車アイコンから「ウェブアプリ」を選択します。
// 5. 以下のように設定して「デプロイ」をクリックします：
//    - 説明: 任意 (例: 予約アプリ連携)
//    - 次のユーザーとして実行: 自分
//    - アクセスできるユーザー: 全員
// 6. デプロイ完了後に表示される「ウェブアプリのURL」をコピーします。
// 7. index.html の予約の有効化ボタンの処理にある `GAS_URL` に貼り付けます。
// =========================================================================

function doPost(e) {
  try {
    // 1. アプリから送られてきたデータ(予約一覧の配列)を取得
    var reservations = JSON.parse(e.postData.contents);

    // 2. カレンダーを取得 (imuzen127@gmail.comに変更)
    var cal = CalendarApp.getCalendarById('imuzen127@gmail.com');
    if (!cal) {
      throw new Error("指定されたカレンダーにアクセスできません。共有設定などを確認してください。");
    }

    // 3. 過去1ヶ月〜未来1年の連携済み予定を取得し、編集や削除ができるようにする
    var startTime = new Date();
    startTime.setMonth(startTime.getMonth() - 1);
    var endTime = new Date();
    endTime.setFullYear(endTime.getFullYear() + 1);

    var events = cal.getEvents(startTime, endTime);

    // このアプリで登録した予定かどうかをIDでマッピング
    var existingEventsMap = {};
    for (var i = 0; i < events.length; i++) {
      var desc = events[i].getDescription();
      if (desc) {
        var match = desc.match(/\[LINE_APP_RES_ID:(.+?)\]/);
        if (match && match[1]) {
          existingEventsMap[match[1]] = events[i];
        }
      }
    }

    // 4. 送信されてきた予約リストでカレンダーを更新・作成
    var incomingIds = {};
    for (var j = 0; j < reservations.length; j++) {
      var data = reservations[j];
      incomingIds[data.id] = true;

      var title = data.name + "様 予約";
      var description = "お名前: " + data.name + "\n";
      if (data.memo) {
        description += "メモ: \n" + data.memo + "\n\n";
      }
      description += "[LINE_APP_RES_ID:" + data.id + "]"; // システム判別用のID

      var event = existingEventsMap[data.id];

      if (event) {
        // [更新] シームレスに新しい時間帯や終日設定にするため、既存のものを一旦削除して再作成する
        try { event.deleteEvent(); } catch (e) { }
      }

      // カレンダーに予定を追加（新規用、更新用の両方）
      if (data.isAllDay) {
        cal.createAllDayEvent(title, new Date(data.date + "T00:00:00+09:00"), { description: description });
      } else {
        var start = new Date(data.date + "T" + data.time + ":00+09:00");
        var end = new Date(data.date + "T" + data.endTime + ":00+09:00");
        cal.createEvent(title, start, end, { description: description });
      }
    }

    // 5. アプリ上で削除された予約をカレンダーからも消去
    for (var id in existingEventsMap) {
      if (!incomingIds[id]) {
        try { existingEventsMap[id].deleteEvent(); } catch (e) { }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================
// デバッグ・確認用 (WebアプリのURLにブラウザから直接アクセスした時に表示されます)
// =========================================================================
function doGet(e) {
  try {
    var targetAccount = 'imuzen127@gmail.com';
    var cal = CalendarApp.getCalendarById(targetAccount);

    var output = "LINEアプリ連携 - デバッグ画面\n";
    output += "===========================\n";
    output += "実行アカウント: " + Session.getActiveUser().getEmail() + "\n";
    output += "対象カレンダー: " + targetAccount + "\n";

    if (!cal) {
      output += "\n【エラー】カレンダー取得不可: 権限がない、またはアカウントが間違っています。\n";
      return ContentService.createTextOutput(output);
    }
    output += "カレンダー取得: 成功\n";

    var startTime = new Date();
    startTime.setMonth(startTime.getMonth() - 1);
    var endTime = new Date();
    endTime.setFullYear(endTime.getFullYear() + 1);
    var events = cal.getEvents(startTime, endTime);

    var lineEventCount = 0;
    for (var i = 0; i < events.length; i++) {
      var desc = events[i].getDescription() || "";
      if (desc.indexOf("[LINE_APP_RES_ID:") !== -1) {
        lineEventCount++;
      }
    }

    output += "\nこのカレンダー内に登録されているLINEアプリからの予約数: " + lineEventCount + " 件\n";
    output += "===========================\n";
    output += "※「予約数」が0より大きいのにカレンダーアプリで見えない場合、「" + targetAccount + "」のカレンダーの表示チェックが入っていないだけです。\n";

    return ContentService.createTextOutput(output);
  } catch (error) {
    return ContentService.createTextOutput("【致命的エラー】\n" + error.toString());
  }
}
