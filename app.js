var xhr = function(method, url, data={}, query={}, headers={}) {
  return new Promise((resolve, reject) => {
    var xhttp = new XMLHttpRequest({ mozSystem: true });
    var _url = new URL(url);
    for (var y in query) {
      _url.searchParams.set(y, query[y]);
    }
    url = _url.origin + _url.pathname + '?' + _url.searchParams.toString();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4) {
        if (this.status >= 200 && this.status <= 299) {
          try {
            const response = JSON.parse(xhttp.response);
            resolve({ raw: xhttp, response: response});
          } catch (e) {
            resolve({ raw: xhttp, response: xhttp.responseText});
          }
        } else {
          try {
            const response = JSON.parse(xhttp.response);
            reject({ raw: xhttp, response: response});
          } catch (e) {
            reject({ raw: xhttp, response: xhttp.responseText});
          }
        }
      }
    };
    xhttp.open(method, url, true);
    for (var x in headers) {
      xhttp.setRequestHeader(x, headers[x]);
    }
    if (Object.keys(data).length > 0) {
      xhttp.send(JSON.stringify(data));
    } else {
      xhttp.send();
    }
  });
}

if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(str, newStr){
    // If a regex pattern
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
      return this.replace(str, newStr);
    }
    // If a string
    return this.replace(new RegExp(str, 'g'), newStr);

  };
}

function parse(a) {
  var metadata = [];
  const b = a.replaceAll('\"', '');
  const seg = b.split('=');
  for (var i=0;i<seg.length - 1;i++) {
    const n = seg[i].split(' ');
    const n1 = seg[i + 1].split('tvg-');
    metadata[n[n.length - 1]] = n1[0];
  }
  if (metadata['tvg-logo']) {
    const s = metadata['tvg-logo'].split(' ');
    metadata['tvg-logo'] = s[0];
  }
  return metadata;
}

window.addEventListener("load", function() {

  const state = new KaiState({});

  const playVideo = function($router, meta) {
    $router.push(
      new Kai({
        name: 'vplayer',
        data: {
          title: 'vplayer',
          width: 1,
          height: 1,
          ration: 1,
        },
        templateUrl: document.location.origin + '/templates/player.html',
        mounted: function() {
          this.$router.setHeaderTitle(meta.name);
          this.$router.showLoading(false);
          var video = document.getElementById('vplayer');
          video.onloadedmetadata = (evt) => {
            this.data.ratio = evt.target.width / evt.target.height;
            video.width = 240;
            video.clientHeight = 240 / this.data.ratio;
            this.data.width = video.width;
            this.data.height = video.clientHeight;
            console.log('loadedmetadata');
            window['hls'].startLoad();
          }
          video.oncanplaythrough = (evt) => {
            window['video'].play();
            this.$router.hideLoading();
          }
          video.onprogress = (evt) => {
            this.$router.showLoading(false);
          }
          var hls = new Hls({ autoStartLoad: true });
          hls.loadSource(meta.url);
          hls.attachMedia(video);
          hls.on(Hls.Events.BUFFER_APPENDED, () => {
            window['video'].play();
            this.$router.hideLoading();
          })
          window['hls'] = hls;
          window['video'] = video;
        },
        unmounted: function() {
          this.$router.hideLoading();
          window['hls'].destroy();
          window['hls'] = null;
          window['video'] = null;
        },
        softKeyText: { left: 'Fullscreen', center: '', right: '' },
        softKeyListener: {
          left: function() {
            if (!document.fullscreenElement) {
              document.getElementById('app').requestFullscreen();
              screen.orientation.lock('landscape');
              document.getElementById('vplayer').width = 320;
              document.getElementById('vplayer').clientHeight = (320 / this.data.ratio);
              this.$router.setSoftKeyLeftText('Exit Fullscreen');
            } else {
              screen.orientation.unlock();
              document.exitFullscreen();
              document.getElementById('vplayer').width = this.data.width;
              document.getElementById('vplayer').clientHeight = this.data.height;
              this.$router.setSoftKeyLeftText('Fullscreen');
            }
          },
          center: function() {},
          right: function() {}
        },
        dPadNavListener: {
          arrowUp: function() {
            if (navigator.volumeManager) {
              navigator.volumeManager.requestShow();
            } else {
            }
          },
          arrowRight: function() {
          },
          arrowDown: function() {
            if (navigator.volumeManager) {
              navigator.volumeManager.requestShow();
            } else {
            }
          },
          arrowLeft: function() {
          },
        },
        backKeyListener: function() {
          if (document.fullscreenElement) {
            screen.orientation.unlock();
            document.exitFullscreen();
            document.getElementById('vplayer').width = this.data.width;
            document.getElementById('vplayer').clientHeight = this.data.height;
            this.$router.setSoftKeyLeftText('Fullscreen');
            return true;
          } else {
            return false;
          }
        }
      })
    );

  }

  const browseChannel = function($router, item) {
    $router.showLoading();
    xhr('GET', item.url)
    .then((data) => {
      var channels = [];
      var d = M3U.parse(data.response);
      for (var x in d) {
        if (d[x]) {
          const meta = parse(d[x].title);
          channels.push({
            name: meta['tvg-name'],
            country: meta['tvg-country'],
            lang: meta['tvg-language'],
            desc: meta['group-title'],
            url: d[x].file,
          });
        }
      }
      $router.push(
        new Kai({
          name: 'channel',
          data: {
            title: '_channel_',
            channels: channels,
          },
          verticalNavClass: '.channelNav',
          templateUrl: document.location.origin + '/templates/channels.html',
          mounted: function() {
            this.$router.setHeaderTitle(item.name);
          },
          unmounted: function() {},
          methods: {
            selected: function(meta) {
              playVideo($router, meta);
            }
          },
          softKeyText: { left: '', center: 'SELECT', right: '' },
          softKeyListener: {
            left: function() {},
            center: function() {
              const selected = this.data.channels[this.verticalNavIndex];
              if (selected) {
                this.methods.selected(selected);
              }
            },
            right: function() {}
          },
          dPadNavListener: {
            arrowUp: function() {
              this.navigateListNav(-1);
            },
            arrowDown: function() {
              this.navigateListNav(1);
            }
          }
        })
      );
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      $router.hideLoading();
    })
  }

  const browseCategory = function($router, name) {
    var LINKS = [];
    if (name === 'By Category') {
      for (var x in CATEGORY) {
        LINKS.push({ name: x, url: CATEGORY[x] });
      }
    } else if (name === 'By Country') {
      for (var x in COUNTRY) {
        LINKS.push({ name: x, url: COUNTRY[x] });
      }
    } else if (name === 'By Language') {
      for (var x in LANGUAGE) {
        LINKS.push({ name: x, url: COUNTRY[x] });
      }
    }
    $router.push(
      new Kai({
        name: 'browse',
        data: {
          title: 'browse',
          list: LINKS,
        },
        verticalNavClass: '.homeNav',
        templateUrl: document.location.origin + '/templates/home.html',
        mounted: function() {
          this.$router.setHeaderTitle(name);
          this.methods.renderSoftKeyLCR();
        },
        unmounted: function() {
        },
        methods: {
          selected: function(item) {
            browseChannel($router, item);
          },
          renderSoftKeyLCR: function() {
            if (this.$router.bottomSheet) {
              return
            }
            if (this.verticalNavIndex > -1) {
              const selected = this.data.list[this.verticalNavIndex];
              if (selected) {
                this.$router.setSoftKeyCenterText('SELECT');
              }
            }
          },
          search: function(keyword) {
            const results = [];
            for (var x in LINKS) {
              if (LINKS[x].name.toLowerCase().indexOf(keyword.toLowerCase()) > -1) {
                results.push(LINKS[x]);
              }
            }
            this.verticalNavIndex = -1;
            this.setData({ list: results });
          }
        },
        softKeyText: { left: 'Search', center: '', right: 'Reset' },
        softKeyListener: {
          left: function() {
            const searchDialog = Kai.createDialog('Search', '<div><input id="search-input" placeholder="Enter your keyword" class="kui-input" type="text" /></div>', null, '', undefined, '', undefined, '', undefined, undefined, this.$router);
            searchDialog.mounted = () => {
              setTimeout(() => {
                setTimeout(() => {
                  this.$router.setSoftKeyText('Cancel' , '', 'Search');
                }, 103);
                const SEARCH_INPUT = document.getElementById('search-input');
                if (!SEARCH_INPUT) {
                  return;
                }
                SEARCH_INPUT.focus();
                SEARCH_INPUT.addEventListener('keydown', (evt) => {
                  switch (evt.key) {
                    case 'Backspace':
                    case 'EndCall':
                      if (document.activeElement.value.length === 0) {
                        this.$router.hideBottomSheet();
                        setTimeout(() => {
                          this.methods.renderSoftKeyLCR();
                          SEARCH_INPUT.blur();
                        }, 100);
                      }
                      break
                    case 'SoftRight':
                      this.$router.hideBottomSheet();
                      setTimeout(() => {
                        this.methods.renderSoftKeyLCR();
                        SEARCH_INPUT.blur();
                        this.methods.search(SEARCH_INPUT.value);
                      }, 100);
                      break
                    case 'SoftLeft':
                      this.$router.hideBottomSheet();
                      setTimeout(() => {
                        this.methods.renderSoftKeyLCR();
                        SEARCH_INPUT.blur();
                      }, 100);
                      break
                  }
                });
              });
            }
            searchDialog.dPadNavListener = {
              arrowUp: function() {
                const SEARCH_INPUT = document.getElementById('search-input');
                SEARCH_INPUT.focus();
              },
              arrowDown: function() {
                const SEARCH_INPUT = document.getElementById('search-input');
                SEARCH_INPUT.focus();
              }
            }
            this.$router.showBottomSheet(searchDialog);
          },
          center: function() {
            const selected = this.data.list[this.verticalNavIndex];
            if (selected) {
              this.methods.selected(selected);
            }
          },
          right: function() {
            this.verticalNavIndex = -1;
            this.setData({ list: LINKS });
          }
        },
        dPadNavListener: {
          arrowUp: function() {
            if (this.verticalNavIndex <= 0) {
              return
            }
            this.navigateListNav(-1);
          },
          arrowDown: function() {
            if (this.verticalNavIndex === this.data.list.length - 1) {
              return
            }
            this.navigateListNav(1);
          }
        },
        backKeyListener: function() {}
      })
    );
  }

  const home = new Kai({
    name: 'home',
    data: {
      title: 'home',
      list: [
        {name : 'By Category'},
        {name : 'By Country'},
        {name : 'By Language'},
      ],
    },
    verticalNavClass: '.homeNav',
    templateUrl: document.location.origin + '/templates/home.html',
    mounted: function() {
      this.$router.setHeaderTitle('Browse IPTV');
    },
    unmounted: function() {
    },
    methods: {
      selected: function(item) {
        browseCategory(this.$router, item.name);
      },
    },
    softKeyText: { left: 'Menu', center: 'SELECT', right: 'Exit' },
    softKeyListener: {
      left: function() {
      },
      center: function() {
        const selected = this.data.list[this.verticalNavIndex];
        if (selected) {
          this.methods.selected(selected);
        }
      },
      right: function() {
        this.$router.showDialog('Exit', 'Are you sure to exit ?', null, 'Yes', () => {
          window.close();
        }, 'No', () => {
          setTimeout(() => {
            this.methods.renderSoftKeyLCR();
          }, 500);
        }, ' ', null, () => {});
      }
    },
    dPadNavListener: {
      arrowUp: function() {
        if (this.verticalNavIndex <= 0) {
          return
        }
        this.navigateListNav(-1);
      },
      arrowDown: function() {
        if (this.verticalNavIndex === this.data.list.length - 1) {
          return
        }
        this.navigateListNav(1);
      }
    },
    backKeyListener: function() {
      return false;
    }
  });

  const router = new KaiRouter({
    title: 'KaiKit',
    routes: {
      'index' : {
        name: 'home',
        component: home
      },
    }
  });

  const app = new Kai({
    name: '_APP_',
    data: {},
    templateUrl: document.location.origin + '/templates/template.html',
    mounted: function() {},
    unmounted: function() {},
    router,
    state
  });

  try {
    app.mount('app');
  } catch(e) {
    console.log(e);
  }

  function displayKaiAds() {
    var display = true;
    if (window['kaiadstimer'] == null) {
      window['kaiadstimer'] = new Date();
    } else {
      var now = new Date();
      if ((now - window['kaiadstimer']) < 300000) {
        display = false;
      } else {
        window['kaiadstimer'] = now;
      }
    }
    console.log('Display Ads:', display);
    if (!display)
      return;
    getKaiAd({
      publisher: 'ac3140f7-08d6-46d9-aa6f-d861720fba66',
      app: 'y-tube',
      slot: 'kaios',
      onerror: err => console.error(err),
      onready: ad => {
        ad.call('display')
        setTimeout(() => {
          document.body.style.position = '';
        }, 1000);
      }
    })
  }

  // displayKaiAds();

  document.addEventListener('visibilitychange', function(ev) {
    if (document.visibilityState === 'visible') {
      // displayKaiAds();
    }
  });

});
