;; weather-oracle.clar
;; This contract provides verified weather data for insurance calculations

;; Define authorized data providers
(define-map authorized-providers
  { provider: principal }
  { authorized: bool }
)

;; Weather data structure
(define-map weather-data
  { location: (string-utf8 100), timestamp: uint }
  {
    temperature: int,
    rainfall: uint,
    wind-speed: uint,
    provider: principal
  }
)

;; Initialize contract owner
(define-data-var contract-owner principal tx-sender)

;; Add an authorized provider
(define-public (add-provider (provider principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u1))
    (map-set authorized-providers
      { provider: provider }
      { authorized: true }
    )
    (ok true)
  )
)

;; Remove an authorized provider
(define-public (remove-provider (provider principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u1))
    (map-set authorized-providers
      { provider: provider }
      { authorized: false }
    )
    (ok true)
  )
)

;; Submit weather data
(define-public (submit-weather-data
                (location (string-utf8 100))
                (timestamp uint)
                (temperature int)
                (rainfall uint)
                (wind-speed uint))
  (let ((provider-status (map-get? authorized-providers { provider: tx-sender })))
    (if (and
          (is-some provider-status)
          (get authorized (unwrap-panic provider-status)))
      (begin
        (map-set weather-data
          { location: location, timestamp: timestamp }
          {
            temperature: temperature,
            rainfall: rainfall,
            wind-speed: wind-speed,
            provider: tx-sender
          }
        )
        (ok true)
      )
      (err u1) ;; Not authorized
    )
  )
)

;; Get weather data
(define-read-only (get-weather-data (location (string-utf8 100)) (timestamp uint))
  (map-get? weather-data { location: location, timestamp: timestamp })
)

;; Check if extreme weather conditions exist
(define-read-only (is-extreme-weather (location (string-utf8 100)) (timestamp uint))
  (let ((data (map-get? weather-data { location: location, timestamp: timestamp })))
    (if (is-some data)
      (let ((unwrapped-data (unwrap-panic data)))
        (or
          (> (get rainfall unwrapped-data) u100)  ;; Heavy rainfall
          (< (get temperature unwrapped-data) (- 5))  ;; Freezing temperature
          (> (get wind-speed unwrapped-data) u50)  ;; Strong winds
        )
      )
      false
    )
  )
)
