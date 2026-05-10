Pod::Spec.new do |s|
  s.name           = 'StylusInput'
  s.version        = '0.1.0'
  s.summary        = 'Precision stylus input view for Flip Canvas'
  s.description    = 'Collects Apple Pencil and touch input samples for Flip Canvas drawing.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
