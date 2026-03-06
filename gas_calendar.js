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
// 7. index.html の907行目付近にある `const GAS_URL = ""` のダブルクォーテーションの間に、
//    コピーしたURLを貼り付けます。
// =========================================================================

function doPost(e) {
  try {
    // 1. アプリから送られてきたデータを取得して解析 (text/plainで送られるためそのままパース)
    var data = JSON.parse(e.postData.contents);
    
    // 2. デフォルトのカレンダーを取得
    var cal = CalendarApp.getDefaultCalendar();
    
    // 3. イベント名（タイトル）を設定
    var title = data.name + "様 予約";
    
    // 4. イベント詳細（説明）を設定
    var description = "お名前: " + data.name + "\n";
    if (data.memo) {
      description += "メモ: \n" + data.memo;
    }
    
    // 5. カレンダーへの登録処理
    if (data.isAllDay) {
      // ▼終日予定の場合
      // data.date は "YYYY-MM-DD" 形式で送られてきます
      var date = new Date(data.date);
      cal.createAllDayEvent(title, date, {description: description});
    } else {
      // ▼時間指定の場合
      // data.time, data.endTime は "HH:mm" 形式で送られてきます
      var start = new Date(data.date + "T" + data.time + ":00");
      var end = new Date(data.date + "T" + data.endTime + ":00");
      cal.createEvent(title, start, end, {description: description});
    }
    
    // 6. 成功メッセージをアプリに返す
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // 7. エラー発生時にエラーメッセージを返す
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
