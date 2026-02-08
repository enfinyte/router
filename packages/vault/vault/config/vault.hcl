ui            = true
cluster_addr  = "http://127.0.0.1:8201"
api_addr      = "http://127.0.0.1:8200"
disable_mlock = true

storage "raft" {
  path = "/vault/data"
  node_id = "node_id"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  // NOTE: only for dev
  tls_disable = true
}
