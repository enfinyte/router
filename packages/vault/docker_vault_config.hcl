ui            = true
disable_mlock = true

storage "postgresql" {
  connection_url = "${VAULT_PG_CONNECTION_URL}"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  // NOTE: only for dev
  tls_disable = true
}
