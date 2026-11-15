# gateway

Fly.io で動く dfx の Discord Gateway 接続である。
受けたイベントをジョブにして、Web の `/api/gateway` へ署名付きで POST する。
ジョブの型・署名・パスは `libs/ingest/util-gateway-contract` が Web と共有する。
