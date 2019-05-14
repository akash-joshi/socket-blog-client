import React, { useEffect } from 'react';
import useLocalStorage from 'react-use-localstorage';
import useSocket from 'use-socket.io-client';
import { useImmer } from 'use-immer';
import { useOnlineStatus, useWindowSize } from '@withvoid/melting-pot';
import useClippy from 'use-clippy';

import './index.css';

const Messages = props => { 
  const [ clipboard, setClipboard ] = useClippy();

  return props.data.map(m => m[0] !== '' ? 
(<li><strong>{m[0]}</strong> :<a onClick={()=>{setClipboard(`${m[1]}`)}} href="#"><i style={{float:'right',color:'black'}} class=" material-icons">content_copy</i></a> <div className="innermsg">{m[1]}</div></li>) 
: (<li className="update">{m[1]}</li>) ); 
}

const Online = props => props.data.map(m => <li id={m[0]}>{m[1]}</li>)

export default () => {
  const [room, setRoom] = useLocalStorage('room','');
  const [id, setId] = useLocalStorage('id', '');

  const [socket] = useSocket('https://open-chat-naostsaecf.now.sh');

  const [messages, setMessages] = useImmer([]);

  const [onlineList, setOnline] = useImmer([]);

  const { online } = useOnlineStatus();
  const { width } = useWindowSize();

  useEffect(()=>{
    socket.connect();

    if(id){
      socket.emit('join',id,room);
    }

    socket.on('message que',(nick,message) => {
      setMessages(draft => {
        draft.push([nick,message])
      })
    });

    socket.on('update',message => setMessages(draft => {
      draft.push(['',message]);
    }))

    socket.on('people-list',people => {
      let newState = [];
      for(let person in people){
        newState.push([people[person].id,people[person].nick]);
      }
      setOnline(draft=>{draft.push(...newState)});
    });

    socket.on('add-person',(nick,id)=>{
      setOnline(draft => {
        draft.push([id,nick])
      })
    })

    socket.on('remove-person',id=>{
      setOnline(draft => draft.filter(m => m[0] !== id))
    })

    socket.on('chat message',(nick,message)=>{
      setMessages(draft => {draft.push([nick,message])})
    })
  },0);

  const handleSubmit = e => {
    e.preventDefault();
    const name = document.querySelector('#name').value.trim();
    console.log(name);
    if (!name) {
      return alert("Name can't be empty");
    }
    setId(name);
    setRoom(document.querySelector('#room').value.trim());
    socket.emit("join", name,room);
  };

  const handleSend = e => {
    e.preventDefault();
    const input = document.querySelector('#m');
    if(input.value.trim() !== ''){
      socket.emit('chat message',input.value,room);
      input.value = '';
    }
  }

  const logOut = () => {
    socket.disconnect();
    setOnline(draft=>[]);
    setMessages(draft=>[]);
    setId('');
    socket.connect();
  }

  return id !== '' ? (
    <section style={{display:'flex',flexDirection:'row'}} >
      <ul id="messages"><Messages data={messages} /></ul>
      <ul id="online"> {online ? '❤️ You are Online' : '💛 You are Offline'} <a onClick={()=>logOut()} href='#'><div style={{float:'right'}}>❌</div></a><hr/><Online data={onlineList} /> </ul>
      <div id="sendform">
        <form onSubmit={e => handleSend(e)} style={{display: 'flex'}}>
            <input id="m" />
            {width > 1000 ? <button style={{width:'100px'}} type="submit">Send Message</button> :
          <button style={{width:'50px'}}><i style={{fontSize:'15px'}} class="material-icons">send</i></button>}
        </form>
      </div>
    </section>
  ) : (
    <div style={{ textAlign: 'center', margin: '30vh auto', width: '70%' }}>
      <form onSubmit={event => handleSubmit(event)}>
        <input id="name" required placeholder="What is your name .." /><br />
        <input id="room" placeholder="What is your room .." /><br />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};