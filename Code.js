const propetiesService = PropertiesService
const scriptProperties = propetiesService.getScriptProperties()
const WebhookURL = scriptProperties.getProperty('URL')
const TOKEN = scriptProperties.getProperty('TOKEN')
const YEAR = scriptProperties.getProperty('YEAR')
const ChannelName = scriptProperties.getProperty('ChannelName')

// 担当者をリマインドする関数
function notifyReminderInfo() {
  var today = new Date();
  var dayOfWeek = today.getDay(); // 0: 日曜日, 1: 月曜日, 2: 火曜日, ...

  var messageBody;
  if (dayOfWeek === 1) { // 月曜日なら
    messageBody = announceMember();
  } else { // 月曜日以外なら
    messageBody = reminderMember();
  }

  if (messageBody !== null) {
    setForSlack(messageBody, ChannelName); // 通知チャンネル
  }
}

// スプシから担当者のIDを取得
function getMemberId(index) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(YEAR); // シート名を指定
  var lastRow = sheet.getLastRow();
  var range = sheet.getRange('A2:C' + lastRow); // データがある範囲を取得
  var values = range.getValues(); // データを取得

  var member = values[index][1]; // 担当者
  var memberId = getUserIdByName(member);

  return memberId;
}

// スプシから担当者の完了フラグを取得
function getReminderFlag(index) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(YEAR); // シート名を指定
  var lastRow = sheet.getLastRow();
  var range = sheet.getRange('A2:C' + lastRow); // データがある範囲を取得
  var values = range.getValues(); // データを取得

  var reminderFlag = values[index][2];

  return reminderFlag;
}

// 担当者に通知メッセージ（月曜日の処理）
function announceMember() {
  var rowIndex = getMemberIndex();

  if (rowIndex === -1) {
    console.log('No matching member found.');
    var message =
      '担当者が見つかりませんでした。\n' +
      '掃除当番表を確認してください。';
    return message;
  }

  var memberId = getMemberId(rowIndex);
  if (memberId === null) {
    console.log('No matching member id found.');
    var message =
      '該当するidのユーザーが見つかりませんでした。\n' +
      '管理者はスプレッドシートのuser_idを確認してください。';
    return message;
  }

  var message =
    '今週の掃除当番担当は、 ' + '<@' + memberId + '>' + ' さんです！\n' +
    '居室・実験室の掃除機がけ、ゴミ出し、ゴミ袋の補充を忘れないようにしてください！\n' +
    '掃除の仕方が分からない場合は、チャンネルにピン留めされているメッセージを確認してください。\n' + 
    '可能な限り、月曜日中にお願いします。\n' +
    '終了したらこのbot宛にメンションして完了報告してください！';
  return message;
}

// 掃除完了報告がきていない場合に、リマインドする関数（火曜日以降の処理）
function reminderMember() {
  var rowIndex = getMemberIndex();

  if (rowIndex === -1) {
    console.log('No matching member found.');
    var message =
      '担当者が見つかりませんでした。\n' +
      '掃除当番表を確認してください。';
    return message;
  }

  var memberId = getMemberId(rowIndex);
  if (memberId === null) {
    console.log('No matching member id found.');
    var message =
      '該当するidのユーザーが見つかりませんでした。\n' +
      'スプレッドシートのuser_idを確認してください。';
    return message;
  }

  var reminderFlag = getReminderFlag(rowIndex);

  if (reminderFlag === "o")
    return null;
  
  var message =
    '今週の掃除当番担当は、 ' + '<@' + memberId + '>' + ' さんです。\n' +
    '掃除が完了したら、このbotにメンションして完了報告してください。\n' + 
    '次週以降に影響するので、忘れないように早めにお願いします。'
  return message;

}

// その週の掃除担当者のスプシの行インデックスを取得
function getMemberIndex() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(YEAR); // 表が記載されているsheetの名前
  var today = new Date();
  var lastRow = sheet.getLastRow();
  var members = sheet.getRange('A2:C' + lastRow).getValues();
  
  for (var i = 0; i < members.length; i++) {
    var date = new Date(members[i][0]);

    // todayがdate以降で、かつ1週間以内かどうかをチェック
    var diffInDays = Math.floor((today - date) / (1000 * 60 * 60 * 24)); // 日数の差を計算
    if (diffInDays >= 0 && diffInDays < 7) {
      return i;
    }
  }

  // 多分スプシが更新されてない
  return -1;
}

// 名前からidを取得
function getUserIdByName(name) {
  // スプレッドシートとシートを指定
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('user_id');
  
  // シートのデータを取得
  var data = sheet.getDataRange().getValues();
  
  // データをループして、指定された名前に対応するuser_idを検索
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == name) {
      return data[i][1];
    }
  }
  
  // 名前が見つからなかった場合はnullを返す
  return null;
}

// SlackのWebhook URLにHTTPリクエストを送る関数
function setForSlack(body, channel) {
  var data = {
    'channel' : channel,
    'username' : 'Cleaning Reminder',
    'attachments': [{
      'color': '#008000',
      'text' : body,
    }],
  };

  var payload = JSON.stringify(data);
  var options = {
    'method' : 'POST',
    'contentType' : 'application/json',
    'payload' : payload
  };

  console.log('data');
  console.log(data);
  UrlFetchApp.fetch(WebhookURL, options);
}

//////////////////////////////////////////
// Event Subscriptionに対する応答（終了報告）

// このbot宛にメンションされたら、そのユーザーが掃除担当者だった場合に当番表の「完了」列にoを入れる
function doPost(e) {
  // https://api.slack.com/apis/events-api
  
  var params = JSON.parse(e.postData.contents);

  // Event Subscriptions のリクエストURL認証用の処理
  // https://api.slack.com/apis/events-api#handshake
  if (params.type === 'url_verification') {
    return ContentService.createTextOutput(params.challenge);
  }

  // botの投稿を無視する（無限ループ回避のため）
  if (params.event.bot_id) return;

  // メッセージを送信したユーザーのIDを取得
  memberId = params.event.user; 
  var flag = updateSheet(memberId);

  console.log('flag');
  console.log(flag);

  if (flag) {
    // 応答メッセージ
    var messageBody =
      '<@' + memberId + '>' + '\n' +
      '完了報告ありがとうございます！\n' +
      'お疲れ様でした！';

    setForSlack(messageBody, ChannelName); // 通知チャンネル

    // debug用
    // postMessageToSlack(Token, message, params.event.channel, params.event.ts);
  }
  
  // 何かしら応答する必要がある
  return ContentService.createTextOutput("");
}

function doGet(e) {
  // ログ「Script function not found: doGet」 を回避するために一応入れてる
}

function updateSheet(userId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(YEAR); // シート名を指定

  var rowIndex = getMemberIndex(); // 該当する行のインデックスを取得
  if (rowIndex === -1) {
    console.log('No matching member found.');
    return false;
  }

  var memberId = getMemberId(rowIndex);
  if (memberId === null) {
    console.log('No matching member id found.');
    return false;
  }

  if (userId === memberId) {
    // 該当する行の「完了」列（C列）を「o」に変更
    sheet.getRange(rowIndex + 2, 3).setValue('o'); // rowIndex + 2 で行番号を調整（ヘッダー行を除外するため）
    return true;
  }

  // 返信した人が掃除の担当者じゃなかった
  return false;
}

//////////////
// debug用

// Slackにメッセージを投稿
function postMessageToSlack(token, message, channelId, ts) {

  var payload = {
    channel: channelId,
    text: message,
  };
  var options = {
    method: "post",
    contentType: "application/json",
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify(payload),
  };

  // SlackAPIにリクエストを送信
  var apiUrl = "https://slack.com/api/chat.postMessage";
  var response = UrlFetchApp.fetch(apiUrl, options);

  // レスポンスを確認しとく
  var responseData = JSON.parse(response.getContentText());
  if (!responseData.ok) {
    console.log("Slack API Error:", responseData.error);
    throw new Error(response);
  }
}