# Cleaning Reminder
中村研のSlackで掃除の担当者にリマインドを送るbotです。必要に応じて管理してください。

## プログラムの概要
- 毎日午前9~10時に、notifyReminderInfoメソッドが実行されるようにGAS上でトリガーを設定しています。
- このメソッドは、掃除当番表のスプレッドシートからその週の掃除当番を取得し、Slackにリマインドを送信します。
- 掃除完了報告がない場合は、掃除完了報告がくるまで毎日リマインドを送信します。
- 掃除担当者がこのbotにメンション付きで掃除完了報告を送信すると、その週のリマインドは終了します。
  - メンションが来た場合は、即座にdoPostメソッドが実行されます。
  - スプシの今週の担当者でない人が掃除完了報告を送信しても、リマインドは終了しません。
  - 従って、もし学生がスプシ自体を変更せずに掃除当番を変更した場合には、掃除完了報告をしたにも関わらず翌日以降もリマインドが来てしまいます。
- 掃除完了報告があった場合は、スプシの完了列にoを自動記入することで完了確認を行っています。リマインドを止めたい場合は、この列にoを記入すると良いでしょう。


## 管理方法
中村研の学生共通Googleアカウントでログインし、[Google Apps Script](https://script.google.com/) (GAS) にアクセスすることで、`Cleaning Reminder`プロジェクトにアクセスできます。  
プログラムの実行ログは、[Google Cloudのログ](https://console.cloud.google.com/logs/)で確認できます。また、実行時に何らかのエラーが発生している場合は、Gmailにエラーメールが送信されます。  
SlackのAPI関連の設定は、[Slack API](https://api.slack.com/apps)で行います。こちらは各自のSlackアカウントでログインして行ってください。ただし、Collaboratorsに追加されていないと設定を変更することができません。

### 年度更新時に行うこと
1. 中村研の掃除当番表のスプレッドシートにアクセスし、新しい年度のシートを作成する。
2. GASを開き、`user_id`のシートを新年度版に更新する。[ユーザーid確認方法](https://zenn.dev/shown_it/articles/4fdec84cba4034)
3. GASを開き、`プロジェクトの設定`→`スクリプトプロパティ`の`Year`の値を新年度版（1. で追加したシートの名前）に更新する。
4. [Slack API](https://api.slack.com/apps)から、Collaboratorsに次年度以降に管理する学生を追加する。***⚠️これを忘れると、次年度以降管理できなくなる可能性があります。*** 現状やり方が分からないのでしていませんが、できるなら学生全員に編集権限を与えると良いと思います。

### コードの変更について
コードの変更を行う場合は、GASのエディタから直接編集するか、[clasp](https://github.com/google/clasp)を用いてローカルで編集し、GASに反映させてください。後者の場合はgitを用いて管理ができ変更履歴を残すことができるので、後者の方を推奨します。  
このリポジトリをそのまま使ってもらっても良いです。プルリクを送ってもらうか、Collaboratorsに追加することで対応します。ただ、各自でフォークして毎年更新していく方が楽ではないかと思います。

WebhookURLやアクセストークンなどの秘匿情報は、GASのプロジェクトプロパティに保存しています。このリポジトリのように、公開リポジトリにコードを公開する場合は、秘匿情報を含むファイルを`.gitignore`で除外するか、GASのプロジェクトプロパティに保存するなどして、情報が漏洩しないように注意して下さい。

また、コードの変更はプロジェクトの保存だけでは反映されません。変更を反映させるためにはデプロイし、Slakの`Event Subscriptions`の`Request URL`を変更する必要があります。

#### 変更手順
1. GASの右上のデプロイボタンをクリックし、新しいデプロイを作成する。そして表示されるURLをコピーする。
2. [Slack API](https://api.slack.com/apps)から、`Event Subscriptions`の`Request URL`をコピーした新しいデプロイのURLに変更する。
