Pod::Spec.new do |s|
  s.name           = 'VideoEncoder'
  s.version        = '0.1.0'
  s.summary        = 'Local MP4 and GIF encoder for Flip Canvas'
  s.description    = 'Encodes local PNG frames into a silent H.264 MP4 or animated GIF.'
  s.author         = 'Flip Canvas'
  s.homepage       = 'https://github.com/joowon-jang/flip-canvas'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: 'https://github.com/joowon-jang/flip-canvas.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
