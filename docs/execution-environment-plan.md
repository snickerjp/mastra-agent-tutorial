# Mastraエージェントハンズオン 実行環境構築案

## 概要

複数人を対象としたハンズオンを、会社契約のAWS環境で安全に実施するための実行環境案。

---

## 要件

- **セキュリティ**: パブリック環境を避け、情報漏洩リスクを最小化
- **管理性**: 参加者の環境を一元管理し、使用後の確実なクリーンアップ
- **コスト**: 必要最小限のリソースで実施
- **再現性**: 全参加者が同じ環境で実行可能

---

## 推奨案: AWS SageMaker Studio + AWS Bedrock

### 概要

AWS SageMaker Studio（有償版）を使用し、各参加者に独立した開発環境を提供。LLMはAWS Bedrockを使用することで、IAM Role認証のみで実行可能（APIキー不要）。

### メリット

- ✅ ブラウザベースで環境構築不要
- ✅ IAM Roleによる認証で、APIキーの管理が不要
- ✅ AWS Bedrockで完全にAWS内で完結
- ✅ セッション終了後の自動クリーンアップ設定が可能
- ✅ IAMロールで権限を厳密に制御
- ✅ OpenAI APIキーの取得・管理が不要

### 構成

```
参加者 → AWS SageMaker Studio
         ├─ IAM Role (Bedrock実行権限)
         ├─ Node.js 22.13+ 環境
         ├─ Git clone: mastra-agent-tutorial (Bedrock対応版)
         └─ AWS Bedrock (Amazon Nova Lite等)
```

### 必要な変更点

Mastraは[AWS Bedrockをサポート](https://mastra.ai/en/models/providers/amazon-bedrock)しているため、コード修正が必要です。

#### コード例（変更前: OpenAI）

```typescript
import { Agent } from '@mastra/core';

const agent = new Agent({
  name: 'blog-writer',
  model: 'openai/gpt-4o-mini',
  // ...
});
```

#### コード例（変更後: Bedrock）

```typescript
import { Agent } from '@mastra/core';
import { getModel } from '../config/models.js';

const agent = new Agent({
  name: 'blog-writer',
  model: getModel(),  // bedrock/amazon.nova-lite-v1:0
  // ...
});
```

### セットアップ手順

#### 1. 事前準備（管理者）

```bash
# Bedrock モデルアクセス有効化
# AWS Console → Bedrock → Model access
# Amazon Nova Lite を有効化

# IAM Roleポリシー作成
cat > bedrock-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*",
        "arn:aws:bedrock:*::foundation-model/amazon.nova-*"
      ]
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name MastraBedrockAccess \
  --policy-document file://bedrock-policy.json
```

#### 2. SageMaker Studio環境作成

- AWS Console → SageMaker → Studio
- ドメイン作成（IAM認証モード）
- 参加者数分のユーザープロファイル作成
- 実行ロールに以下をアタッチ:
  - `MastraBedrockAccess` (上記で作成)
  - `AmazonSageMakerFullAccess` (Studio操作用)

#### 3. 参加者向けセットアップスクリプト

各参加者がターミナルで実行:

```bash
# Node.js環境確認・インストール
node --version || conda install -c conda-forge nodejs -y

# リポジトリクローン
git clone https://github.com/a8-sand-box/mastra-agent-tutorial.git
cd mastra-agent-tutorial

# 依存パッケージインストール（@ai-sdk/amazon-bedrockも含む）
npm install

# AWS認証確認（IAM Roleが自動適用される）
aws sts get-caller-identity

# 動作確認（Bedrock使用）
npm run ch1:bedrock
```

**注意**: 
- `.env`ファイルは不要です。IAM Roleで自動認証されます。
- `npm run ch1:bedrock`は内部で`AI_PROVIDER=bedrock`を設定します
- OpenAI版を試す場合は`npm run ch1`を実行

### コスト見積もり

- **SageMaker Studio**: ml.t3.medium × 参加者数 × 実施時間
  - 例: 10人 × 2時間 × $0.05/時間 = **約$1**
- **AWS Bedrock (Nova Lite)**:
  - 入力: $0.06 / 1M tokens
  - 出力: $0.24 / 1M tokens
  - 想定: 1人あたり50k tokens（30k入力, 20k出力） → 10人で約$0.066
- **合計**: 約$1.07（10人・2時間）

**OpenAI API比較**:
- OpenAI GPT-4o: 入力$2.50/1M、出力$10.00/1M
- Bedrock Claude 3.5: 若干高いが、IAM認証の利便性とAWS統合のメリット大

---

## 代替案1: AWS Cloud9 + Bedrock

### 概要

クラウドベースのIDE環境。VS Codeライクなインターフェース。Bedrock統合で同様にIAM認証可能。

### メリット

- ✅ フルマネージドIDE
- ✅ ターミナル、エディタ、デバッガ統合
- ✅ 環境の事前構築・配布が容易
- ✅ IAM Role認証でBedrock利用可能

### デメリット

- ⚠️ SageMaker Studioより若干コスト高
- ⚠️ 2024年7月以降、新規作成が制限される可能性（AWS発表）

### セットアップ

```bash
# 管理者: CloudFormationで一括作成
aws cloudformation create-stack \
  --stack-name mastra-handson-env \
  --template-body file://cloud9-bedrock-template.yaml \
  --parameters ParameterKey=ParticipantCount,ParameterValue=10
```

---

## 代替案2: AWS EC2 + JupyterHub + Bedrock

### 概要

1台のEC2インスタンスにJupyterHubをセットアップし、複数ユーザーで共有。IAM Instance Profileで Bedrock アクセス。

### メリット

- ✅ 1インスタンスで複数人対応可能
- ✅ コスト効率が高い
- ✅ カスタマイズ性が高い
- ✅ IAM Instance ProfileでBedrock認証

### デメリット

- ⚠️ 初期セットアップが複雑
- ⚠️ リソース競合の可能性（CPU/メモリ）

### 構成

```
EC2 (t3.xlarge) + IAM Instance Profile
├─ JupyterHub
├─ Node.js 22.13+
├─ Bedrock SDK
└─ 参加者アカウント × N
```

### セットアップ

```bash
# EC2起動（IAM Instance Profile付き）
aws ec2 run-instances \
  --image-id ami-xxxxxxxxx \
  --instance-type t3.xlarge \
  --iam-instance-profile Name=MastraBedrockRole \
  --key-name your-key \
  --security-group-ids sg-xxxxx

# JupyterHub インストール
sudo apt update
sudo apt install -y python3-pip nodejs npm
pip3 install jupyterhub jupyterlab
npm install -g configurable-http-proxy

# AWS SDK設定（自動でInstance Profileを使用）
# 追加設定不要

# ユーザー作成（強力なランダムパスワード）
# 注意: 本番環境では、SSO/OAuthやより強固な認証を推奨
sudo touch /root/jupyterhub_user_credentials.txt
sudo chmod 600 /root/jupyterhub_user_credentials.txt
for i in {1..10}; do
  sudo useradd -m -s /bin/bash user$i
  PASSWORD=$(openssl rand -base64 24)
  echo "user$i:$PASSWORD" | sudo chpasswd
  echo "user$i:$PASSWORD" | sudo tee -a /root/jupyterhub_user_credentials.txt > /dev/null
done

# JupyterHub起動（ローカルホストのみ）
# 注意: 本番環境では、TLS終端とネットワーク制限を設定してください
# Security Groupで信頼できるIPアドレスのみ許可することを推奨
jupyterhub --ip 127.0.0.1 --port 8000

# または、リバースプロキシ経由でTLS対応する場合:
# jupyterhub --ip 127.0.0.1 --port 8000
# nginx等でTLS終端を設定
```

**セキュリティ注意事項（ハンズオン用途）:**
- 上記は学習用の簡易設定です
- 本番環境では以下を実施してください:
  - SSO/OAuth認証の使用
  - TLS/HTTPS の有効化
  - Security Groupで信頼できるIPのみ許可
  - VPC内での実行
  - 定期的なパスワードローテーション

---

## 代替案3: AWS CodeCatalyst Dev Environments

### 概要

AWS CodeCatalystのクラウドベース開発環境。

### メリット

- ✅ VS Code互換
- ✅ GitHubリポジトリと直接連携
- ✅ 無料枠あり

### デメリット

- ⚠️ 比較的新しいサービス（安定性要確認）
- ⚠️ 組織設定が必要

---

## 推奨構成の詳細フロー

### 事前準備（1週間前）

1. Bedrock モデルアクセス有効化（Claude 3.5 Sonnet）
2. IAM Role/Policy作成（Bedrock実行権限）
3. SageMaker Studio環境作成
4. 参加者アカウント作成・配布
5. Bedrock対応版リポジトリ準備（ブランチ作成）
6. セットアップスクリプト配布

### 当日（ハンズオン開始時）

1. 参加者: SageMaker Studioにログイン
2. 参加者: セットアップスクリプト実行（5分）
3. 参加者: AWS認証確認（`aws sts get-caller-identity`）
4. 講師: Chapter 1から順に解説・実行
5. 参加者: 各自のペースで実行・質問

### 終了後（クリーンアップ）

```bash
# 管理者: 全環境削除
aws sagemaker delete-domain --domain-id d-xxxxx
# Bedrockは従量課金のため、追加クリーンアップ不要
```

---

## セキュリティ考慮事項

### APIキー管理

- ✅ **APIキー不要**: IAM Roleによる認証のみ
- ✅ AWS Bedrockで完全にAWS内で完結
- ✅ 外部サービス（OpenAI）へのAPIキー流出リスクゼロ

### ネットワーク制限

- VPC内に閉じた環境を構築
- 必要最小限のアウトバウンド通信のみ許可:
  - `bedrock-runtime.*.amazonaws.com` (Bedrock API)
  - `github.com` (リポジトリクローン)
- OpenAI APIへの通信が不要

### データ保持

- 参加者の作業データは環境削除時に完全消去
- ログは CloudWatch Logs に集約（監査用）
- Bedrockはデータを学習に使用しない（AWS保証）

---

## コスト比較表

| 方式 | 初期費用 | 実行時費用（10人・2時間） | 管理工数 | IAM認証 |
|------|---------|------------------------|---------|---------|
| **SageMaker Studio + Bedrock** | 無料 | $1.75 | 低 | ✅ |
| AWS Cloud9 + Bedrock | 無料 | $2〜$5 | 低 | ✅ |
| EC2 + JupyterHub + Bedrock | 無料 | $0.5〜$1 | 高 | ✅ |
| CodeCatalyst + Bedrock | 無料 | 無料枠内 | 中 | ✅ |
| ~~SageMaker Studio Lab~~ | 無料 | $0 | 低 | ❌ 不可 |

**注**: Studio Labは無料だがIAM認証非対応のため、Bedrock利用には不向き

---

## 結論

**推奨: AWS SageMaker Studio + AWS Bedrock**

理由:
- **IAM Role認証のみで完結**（APIキー管理不要）
- セキュリティとコストのバランスが最適
- 管理工数が少なく、スケーラブル
- AWS標準サービスで信頼性が高い
- 外部サービス依存なし（完全AWS内完結）

次点: AWS Cloud9 + Bedrock（UIの使いやすさ重視の場合）

---

## 補足: SageMaker Studio Lab について

**重要**: SageMaker Studio Lab は無料ですが、以下の制限があります:

- ❌ AWSアカウント・IAM認証が不要（= IAM Roleが使えない）
- ❌ AWS Bedrockへのアクセス不可
- ❌ OpenAI APIキーを手動管理する必要がある

**結論**: Bedrock利用を前提とする場合、Studio Lab は不適切です。有償の **SageMaker Studio** を使用してください。
