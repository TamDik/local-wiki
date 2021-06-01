# local-wiki

Wikiライクなノートアプリです。

![local-wiki](https://user-images.githubusercontent.com/59227885/109525373-ce7f7300-7af4-11eb-9d4e-5288538604d3.png)

## Features

* [GitHub Flavored Markdow](https://github.github.com/gfm/)拡張による記述
* 編集履歴の管理
* Wiki内リンク・外部リンクの作成
* 画像やPDFなどのメディア埋め込み
* 数式表示
* ページ・メディアのカテゴリ分類
* テンプレート
* ページ間・バージョン間の差分
* 検索
* サイドメニュー編集
* データ保存先の設定

## Script

次のスクリプトが利用できます。
```sh
# 依存パッケージをインストール
npm install

# typescriptをjavascriptにトランスパイル
npm run compile

# 開発モードで実行（事前のコンパイルは不要）
npm start
```


## WikiLink

ページ・リソースへのアクセスやリンクの作成は、`Namespace:WikiType:WikiName`の形式で表されるWikiLinkを指定することで行われます。

### Namespace

名前空間は、ページやリソースなどの識別名が競合することを防ぐ目的で使われます。初めて起動した時に、Mainというデフォルトの名前空間が作成されます。Mainへのアクセスでは、名前空間（Main）を省略することができます（markdown中での名前空間の扱いは[Markdown](#markdown)を参照）。

名前空間は複数作成することができ、それぞれの名前空間ごとにデータの保存先を、アプリ内部（internal）と外部（external）から選択することができます。保存先をDropboxやGoogle Driveなどのストレージサービスのディレクトリに指定することで、複数のデバイス間でデータを共有することもできます。

名前空間に関する[スペシャルページ](#special)
* NamespacePreferences
* AllNamespaces
* NewNamespace

### WikiType

ページをその機能ごとに分類するために、以下WikiTypeが予め定義されています。WikiTypeが省略された場合には、Pageであると解釈されます。

| WikiType | 概要                   | 編集 |
| -------- | ---------------------- | ---- |
| Page     | メインコンテンツページ | yes  |
| File     | メディアの解説ページ   | yes  |
| Category | カテゴリの解説ページ   | yes  |
| Template | テンプレートページ     | yes  |
| Special  | 特別ページ             | no   |

編集可能なWikiTypeのページではmodeというパラメータを指定することによって、閲覧・編集・履歴のモードを指定できます。modeを指定するには、httpでGETパラメータを指定する時のように、WikiLinkの後ろに`Main?mode=edit`のようにします。

| mode    | 概要 |
| ------- | ---- |
| read    | 閲覧 |
| edit    | 編集 |
| history | 履歴 |


### WikiName

WikiNameはページの識別名です。ページのタイトルにも使われます。

## Special

以下のようなスペシャルページが存在します。

| WikiName             | 概要                 |
| -------------------- | -------------------- |
| NamespacePreferences | 名前空間の設定を変更 |
| AllNamespaces        | 全ての名前空間一覧   |
| NewNamespace         | 新規の名前空間を作成 |
| AllPages             | Pageの一覧           |
| Search               | 検索                 |
| Categories           | Categoryの一覧       |
| AllFiles             | Fileの一覧           |
| UploadFile           | Fileをアップロード   |
| SpecialPages         | Specialの一覧        |
| PageDiff             | ページ間の差分       |
| SideMenu             | サイドメニューの編集 |


## Markdown

ページを編集するためには[GitHub Flavored Markdow](https://github.github.com/gfm/)を独自に拡張したマークダウンを使用します。

マークダウン記述の補助機能として`editor=simple`というパラメータが利用可能です。

### WikiLinkの参照

一般的なマークダウンの文法と同様に、WikiLinkへの参照は`[text](WikiLink)`で作成します。

markdown中の参照で名前空間を省略した場合には、Markdownページが存在する名前空間への参照になります。例えば、Fooという名前空間に属するページ中で名前空間が省略された場合には、参照する名前空間はFooになります（Mainではありません）。

### メディア

画像ファイルの埋め込みは`![alt](WikiLink)`で可能です。画像以外のメディアファイルも`{{WikiLink}}`を使用することによってページ中に可能な限り埋め込まれます。

### カテゴリ

ページをカテゴリに追加して、関連するページをまとめて管理することができます。ページをカテゴリに追加するためには、CategoryのWikiLinkを`{{WikiLink}}`という形式でページのどこかに記述します。この`{{WikiLink}}`はどこにでも記述することができますが、表示上はページの最下部にカテゴリのリストとして表示されます。

カテゴリページを他のカテゴリに登録することによって、カテゴリの上位下位関係が定義されます。上位カテゴリが定義されていないカテゴリは、rootが上位カテゴリになります。カテゴリの階層関係をページ中に表示するためには`{{CategoryTree|options}}`とします。`options`には`WikiLink`、`depth`、`border`があります。Categoryの`WikiLink`が指定された場合にはそのカテゴリが表示上の最上位カテゴリになり、指定されなかった場合はrootが指定されたとみなされます。`depth`は表示される階層の深さを`depth=3`のように指定します。指定がない場合は`depth=1`とみなされます。`border`または`noborder`を指定することで、カテゴリ階層の枠線の有無を指定します。

### テンプレート

Templateを適用するためにはTemplateのWikiLinkを使って`{{WikiLink}}`とします。作成されていないTemplateのWikiLinkが指定された場合には、Templateページへのリンクが作成されます。

Templateには位置パラメータ（`{{{1}}}`や`{{{2}}}`）とキーワードパラメータ（`{{{keyword}}}`）を定義できます。キーワードパラメータには`=`で値を設定します。例えば、Templateページ中の`{{{1}}}-{{{2}}}-{{{name}}}`を`v1-v2-nv`とするためには、`{{WikiLink|v1|v2|name=nv}}`や`{{WikiLink|name=nv|2=v2|1=v1}}`のように値を指定します。指定がない場合には`{{{name}}}`のようにそのままの形で表示されますが、`{{{name|defalut value}}}`のようにデフォルトの値を設定することもできます。
